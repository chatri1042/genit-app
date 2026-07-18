import { createClient } from '@/lib/supabase/server';
import PageChar from '@/components/PageChar';
import PricingTable from '@/components/PricingTable';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: packs } = await supabase.from('credit_packs').select('*').eq('active', true).order('sort');

  return (
    <>
      <PricingTable packs={packs ?? []} />
      <PageChar name="plant" side="right" width={240} />
    </>
  );
}
