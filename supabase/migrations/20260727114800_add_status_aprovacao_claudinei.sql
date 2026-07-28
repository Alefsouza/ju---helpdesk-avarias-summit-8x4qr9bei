-- Add status_aprovacao_claudinei column to chamados
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS status_aprovacao_claudinei TEXT;

-- RLS: Allow Claudinei to SELECT chamados
DROP POLICY IF EXISTS "claudinei_select_chamados" ON public.chamados;
CREATE POLICY "claudinei_select_chamados" ON public.chamados
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' = 'claudinei.mariano@viasudeste.com');

-- RLS: Allow Claudinei to UPDATE chamados (for approval flow)
DROP POLICY IF EXISTS "claudinei_update_chamados" ON public.chamados;
CREATE POLICY "claudinei_update_chamados" ON public.chamados
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'email' = 'claudinei.mariano@viasudeste.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'claudinei.mariano@viasudeste.com');

-- RLS: Allow Claudinei to SELECT anexos_chamado_interno
DROP POLICY IF EXISTS "claudinei_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "claudinei_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' = 'claudinei.mariano@viasudeste.com');

-- Storage: Allow Claudinei to read objects from anexos_chamados_interno bucket
DROP POLICY IF EXISTS "claudinei_select_anexos_internos_storage" ON storage.objects;
CREATE POLICY "claudinei_select_anexos_internos_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos_chamados_interno'
    AND auth.jwt() ->> 'email' = 'claudinei.mariano@viasudeste.com'
  );

-- RLS: Allow Claudinei to SELECT historico_chamado (for viewing history)
DROP POLICY IF EXISTS "claudinei_select_historico_chamado" ON public.historico_chamado;
CREATE POLICY "claudinei_select_historico_chamado" ON public.historico_chamado
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' = 'claudinei.mariano@viasudeste.com');

-- RLS: Allow Claudinei to INSERT historico_chamado (for approval audit trail)
DROP POLICY IF EXISTS "claudinei_insert_historico_chamado" ON public.historico_chamado;
CREATE POLICY "claudinei_insert_historico_chamado" ON public.historico_chamado
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = 'claudinei.mariano@viasudeste.com');
