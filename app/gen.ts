'use server';
// Server Actions: เจนงานจริงด้วย fal.ai — แบบ async (submit → client poll → เก็บผล)
import { createClient } from '@/lib/supabase/server';
import { spendCredits, grantCredits, getCreditBalance } from '@/lib/credits';
import { submitFal, checkFal, FAL_MODELS, buildVisualPrompt, ratioToImageSize, type FalTask } from '@/lib/fal';

type JobRow = {
  id: string; user_id: string; type: string; format: string; ratio: string; count: number;
  duration_sec: number | null; concept: string; script: string | null; brief: any; settings: any;
  voice_config: any; output_urls: any; credits_cost: number; status: string; shots: any[] | null;
};

export type GenState = {
  status: 'queued' | 'running' | 'done' | 'failed';
  total?: number; done?: number;
  results?: { kind: 'image' | 'video'; url: string }[];
  error?: string;
  needCredits?: boolean;
};

async function loadJob(jobId: string): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; job: JobRow } | { error: string }> {
  const supabase = await createClient();
  const { data: job, error } = await supabase.from('jobs').select('*').eq('id', jobId).single();
  if (error || !job) return { error: 'ไม่พบงานนี้' };
  return { supabase, job: job as JobRow };
}

// สร้าง signed URL ให้ผลลัพธ์ที่เก็บแล้ว (ไว้โชว์/ดาวน์โหลด)
// ถ้าต่อคลิปเป็นวิดีโอเดียวสำเร็จ → คืนวิดีโอรวมอันเดียว, ไม่งั้นคืนคลิปแยกทั้งหมด
async function signResults(supabase: Awaited<ReturnType<typeof createClient>>, tasks: FalTask[], composeTask?: FalTask | null) {
  if (composeTask?.done && composeTask.result_path) {
    const { data: s } = await supabase.storage.from('outputs').createSignedUrl(composeTask.result_path, 3600);
    if (s?.signedUrl) return [{ kind: 'video' as const, url: s.signedUrl }];
  }
  const results: { kind: 'image' | 'video'; url: string }[] = [];
  for (const t of tasks) {
    if (t.done && t.result_path) {
      const { data: s } = await supabase.storage.from('outputs').createSignedUrl(t.result_path, 3600);
      if (s?.signedUrl) results.push({ kind: t.kind, url: s.signedUrl });
    }
  }
  return results;
}

// path ผลลัพธ์สำหรับเก็บลง DB (วิดีโอรวมถ้ามี, ไม่งั้นคลิปแยก)
function buildResultPaths(tasks: FalTask[], composeTask?: FalTask | null) {
  if (composeTask?.done && composeTask.result_path) return [{ kind: 'video', path: composeTask.result_path }];
  return tasks.filter((t) => t.done && t.result_path).map((t) => ({ kind: t.kind, path: t.result_path }));
}

// เริ่มเจน: เช็คเครดิตพอ → ส่งงานเข้า fal.ai → สำเร็จแล้วค่อยหักเครดิต (fal ล้มเหลวไม่เสียเครดิต)
export async function startGeneration(jobId: string): Promise<GenState> {
  const r = await loadJob(jobId);
  if ('error' in r) return { status: 'failed', error: r.error };
  const { supabase, job } = r;

  if (job.status === 'running' || job.status === 'done' || job.status === 'failed') return await pollJob(jobId);
  if (job.status !== 'queued') return { status: job.status as any };

  const cost = Math.max(1, job.credits_cost);
  // เช็คยอดพอก่อน (ยังไม่หัก) — ไม่พอก็ให้ไปเติม
  const balance = await getCreditBalance(job.user_id);
  if (balance < cost) return { status: 'queued', needCredits: true, error: 'เครดิตไม่พอ — เติมเครดิตก่อนเริ่มสร้าง' };

  const inputs: string[] = job.output_urls?.inputs ?? [];
  const prompt = buildVisualPrompt({
    brief: job.brief ?? {}, mood: job.settings?.mood, concept: job.concept, format: job.format,
    imageText: job.settings?.image_text,
  });
  const scriptLine = job.script ? ` ${String(job.script).slice(0, 180)}` : '';

  let inputImageUrl = '';
  if (inputs.length) {
    const { data: signed } = await supabase.storage.from('uploads').createSignedUrl(inputs[0], 3600);
    inputImageUrl = signed?.signedUrl ?? '';
  }

  // ภาพจากสตอรีบอร์ด (แต่ละช็อตมี imgPath ใน bucket 'outputs') — ถ้าไม่มีก็ใช้รูปสินค้าแทน
  // kling image-to-video ยึดสัดส่วนตาม "รูปต้นทาง" — ภาพช็อตเป็นแนวตั้งอยู่แล้ว คลิปจะออกมาแนวตั้งเอง
  const shotList: any[] = Array.isArray(job.shots) ? job.shots : [];
  const shotImages: string[] = [];
  for (const s of shotList) {
    if (s?.imgPath) {
      const { data: signed } = await supabase.storage.from('outputs').createSignedUrl(String(s.imgPath), 3600);
      if (signed?.signedUrl) { shotImages.push(signed.signedUrl); continue; }
    }
    if (inputImageUrl) shotImages.push(inputImageUrl); // ช็อตที่ยังไม่มีภาพตัวอย่าง → ใช้รูปสินค้า
  }

  const n = Math.max(1, Math.min(job.count || 1, 6));
  const tasks: FalTask[] = [];
  try {
    if (job.type === 'image') {
      for (let i = 0; i < n; i++) {
        tasks.push(await submitFal(FAL_MODELS.image, { prompt, image_size: ratioToImageSize(job.ratio), num_images: 1 }, 'image'));
      }
    } else if (shotImages.length) {
      // มีสตอรีบอร์ด → ขยับแต่ละช็อตเป็นคลิป (สัดส่วนตามที่เลือก) แล้วค่อยต่อเป็นวิดีโอเดียวใน pollJob
      for (let i = 0; i < shotImages.length; i++) {
        const line = job.script ? ` ${String(job.script).slice(0, 180)}` : '';
        const shotDesc = shotList[i]?.desc || shotList[i]?.name || '';
        const shotPrompt = `${prompt}${shotDesc ? ', ' + String(shotDesc).slice(0, 120) : ''}${line}`;
        tasks.push(await submitFal(FAL_MODELS.i2v, { prompt: shotPrompt, image_url: shotImages[i], duration: '5' }, 'video'));
      }
    } else {
      for (let i = 0; i < n; i++) {
        if (inputImageUrl) tasks.push(await submitFal(FAL_MODELS.i2v, { prompt: prompt + scriptLine, image_url: inputImageUrl, duration: '5' }, 'video'));
        else tasks.push(await submitFal(FAL_MODELS.t2v, { prompt: prompt + scriptLine }, 'video'));
      }
    }
  } catch (e) {
    // ส่งเข้า fal ไม่สำเร็จ — ยังไม่หักเครดิต แค่แจ้ง error
    await supabase.from('jobs').update({ status: 'failed', settings: { ...job.settings, error: String((e as Error).message) } }).eq('id', job.id);
    const needCredits = /คีย์ fal\.ai|เครดิต fal\.ai/.test(String((e as Error).message));
    return { status: 'failed', error: String((e as Error).message), needCredits };
  }

  // ส่งเข้า fal สำเร็จแล้ว ค่อยหักเครดิต
  try {
    await spendCredits(cost, job.type === 'image' ? 'image' : 'video', 'job', job.id);
  } catch (e) {
    return { status: 'queued', needCredits: true, error: 'เครดิตไม่พอ — เติมเครดิตก่อนเริ่มสร้าง' };
  }

  await supabase.from('jobs').update({
    status: 'running',
    output_urls: { ...(job.output_urls ?? {}), tasks },
  }).eq('id', job.id);

  return { status: 'running', total: tasks.length, done: 0 };
}

// เช็คคืบหน้า: งานไหนเสร็จก็ดาวน์โหลดเก็บลง Supabase, ครบแล้ว = done; ล้มหมด = failed + คืนเครดิต
export async function pollJob(jobId: string): Promise<GenState> {
  const r = await loadJob(jobId);
  if ('error' in r) return { status: 'failed', error: r.error };
  const { supabase, job } = r;

  if (job.status === 'queued') return { status: 'queued' };
  const tasks: FalTask[] = job.output_urls?.tasks ?? [];
  if (!tasks.length) return { status: job.status as any, error: job.settings?.error };

  const composeTask: FalTask | null = job.output_urls?.composeTask ?? null;

  // สถานะจบแล้ว — คืนผลลัพธ์ที่มี ไม่ประมวลผลซ้ำ (กันคืนเครดิตซ้ำ)
  if (job.status === 'done' || job.status === 'failed') {
    return { status: job.status as any, total: tasks.length, done: tasks.filter((t) => t.done).length, results: await signResults(supabase, tasks, composeTask), error: job.settings?.error };
  }

  const { data: { user } } = await supabase.auth.getUser();

  // ── ขั้นต่อคลิปเป็นวิดีโอเดียว (compose) กำลังทำงาน ──
  if (composeTask && !composeTask.done && !composeTask.failed) {
    const cres = await checkFal(composeTask);
    if (cres.state === 'pending') {
      return { status: 'running', total: tasks.length, done: tasks.filter((t) => t.done).length, results: await signResults(supabase, tasks, null) };
    }
    if (cres.state === 'done') {
      try {
        const fileRes = await fetch(cres.url!, { cache: 'no-store' });
        const blob = await fileRes.blob();
        const path = `${user?.id}/${jobId}-final.mp4`;
        const { error: upErr } = await supabase.storage.from('outputs').upload(path, blob, { contentType: 'video/mp4', upsert: true });
        if (upErr) composeTask.failed = true;
        else { composeTask.done = true; composeTask.result_path = path; }
      } catch { composeTask.failed = true; }
    } else {
      composeTask.failed = true; // ต่อคลิปไม่สำเร็จ → ใช้คลิปแยกแทน (ไม่ถือว่างานล้ม)
    }
    await supabase.from('jobs').update({
      status: 'done',
      output_urls: { ...(job.output_urls ?? {}), tasks, composeTask, results: buildResultPaths(tasks, composeTask) },
    }).eq('id', jobId);
    return { status: 'done', total: tasks.length, done: tasks.filter((t) => t.done).length, results: await signResults(supabase, tasks, composeTask) };
  }

  let changed = false;
  let jobError = '';

  for (const t of tasks) {
    if (t.done || t.failed) continue;
    const res = await checkFal(t);
    if (res.state === 'pending') continue;
    if (res.state === 'failed') { t.failed = true; jobError = res.error || 'สร้างไม่สำเร็จ'; changed = true; continue; }
    try {
      const fileRes = await fetch(res.url!, { cache: 'no-store' });
      const blob = await fileRes.blob();
      const ext = t.kind === 'video' ? 'mp4' : 'png';
      const path = `${user?.id}/${jobId}-${t.request_id}.${ext}`;
      const { error: upErr } = await supabase.storage.from('outputs').upload(path, blob, { contentType: t.kind === 'video' ? 'video/mp4' : 'image/png', upsert: true });
      if (upErr) { t.failed = true; jobError = 'บันทึกผลลัพธ์ไม่สำเร็จ: ' + upErr.message; }
      else { t.done = true; t.result_path = path; }
      changed = true;
    } catch (e) {
      t.failed = true; jobError = 'ดาวน์โหลดผลลัพธ์ไม่สำเร็จ'; changed = true;
    }
  }

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const failedCount = tasks.filter((t) => t.failed).length;
  const allResolved = doneCount + failedCount >= total;

  // คลิปครบแล้ว & เป็นวิดีโอ & มีคลิปสำเร็จ ≥2 → เริ่มต่อเป็นวิดีโอเดียว (สั่งครั้งเดียว)
  if (allResolved && job.type !== 'image' && doneCount >= 2 && !composeTask) {
    const doneClips = tasks.filter((t) => t.done && t.result_path && t.kind === 'video');
    const urls: string[] = [];
    for (const t of doneClips) {
      const { data: s } = await supabase.storage.from('outputs').createSignedUrl(t.result_path!, 3600);
      if (s?.signedUrl) urls.push(s.signedUrl);
    }
    if (urls.length >= 2) {
      try {
        const keyframes = urls.map((url, i) => ({ url, timestamp: i * 5, duration: 5 }));
        const newCompose = await submitFal(FAL_MODELS.compose, { tracks: [{ id: 'v', type: 'video', keyframes }] }, 'video');
        await supabase.from('jobs').update({
          status: 'running',
          output_urls: { ...(job.output_urls ?? {}), tasks, composeTask: newCompose },
        }).eq('id', jobId);
        return { status: 'running', total, done: doneCount, results: await signResults(supabase, tasks, null) };
      } catch (e) {
        // เริ่มต่อคลิปไม่สำเร็จ → ปล่อยจบเป็นคลิปแยก (ทำต่อด้านล่าง)
      }
    }
  }

  let status: JobRow['status'] = 'running';
  if (allResolved) status = doneCount > 0 ? 'done' : 'failed';

  if (changed || status !== 'running') {
    const results = tasks.filter((t) => t.done && t.result_path).map((t) => ({ kind: t.kind, path: t.result_path }));
    await supabase.from('jobs').update({
      status,
      output_urls: { ...(job.output_urls ?? {}), tasks, results },
      ...(jobError ? { settings: { ...job.settings, error: jobError } } : {}),
    }).eq('id', jobId);

    // ล้มเหลวทั้งหมด — คืนเครดิตที่หักไปให้ (transition เข้า failed ครั้งเดียว)
    if (status === 'failed' && doneCount === 0) {
      try { await grantCredits(job.user_id, Math.max(1, job.credits_cost), 'refund', 'job', jobId); } catch { /* ignore */ }
    }
  }

  return { status: status as any, total, done: doneCount, results: await signResults(supabase, tasks, composeTask), error: jobError || undefined };
}
