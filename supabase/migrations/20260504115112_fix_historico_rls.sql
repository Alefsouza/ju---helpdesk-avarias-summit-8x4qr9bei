-- Enable RLS on the table if not already enabled
ALTER TABLE public.historico_chamado ENABLE ROW LEVEL SECURITY;

-- Delete all existing policies from the table
DROP POLICY IF EXISTS "historico_select" ON public.historico_chamado;
DROP POLICY IF EXISTS "historico_insert" ON public.historico_chamado;
DROP POLICY IF EXISTS "historico_update" ON public.historico_chamado;
DROP POLICY IF EXISTS "historico_delete" ON public.historico_chamado;
DROP POLICY IF EXISTS "Permitir SELECT para admin e responsáveis" ON public.historico_chamado;
DROP POLICY IF EXISTS "Permitir INSERT para responsáveis e admin" ON public.historico_chamado;

-- Create a new SELECT policy allowing admin, responsaveis and the ticket owner to see the history
CREATE POLICY "Permitir SELECT para admin e responsáveis" ON public.historico_chamado
  FOR SELECT TO authenticated USING (
    (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'admin' OR 
    (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'responsavel' OR
    chamado_id IN (SELECT id FROM public.chamados WHERE usuario_id = auth.uid())
  );

-- Create a new INSERT policy allowing any authenticated user to insert history
CREATE POLICY "Permitir INSERT para responsáveis e admin" ON public.historico_chamado
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IS NOT NULL
  );
