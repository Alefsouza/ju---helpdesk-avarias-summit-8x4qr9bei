-- Ensure is_admin is SECURITY DEFINER to prevent recursion on auth checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario 
    WHERE id = auth.uid() AND tipo_usuario = 'admin'
  );
END;
$function$;

-- Create SECURITY DEFINER function to bypass RLS when checking for DP department (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.is_dp()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.perfil_usuario
    WHERE id = auth.uid() AND (departamento = 'DP' OR tipo_usuario = 'dp')
  );
END;
$function$;

-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "perfil_select" ON public.perfil_usuario;
DROP POLICY IF EXISTS "DP pode visualizar perfis de usuários" ON public.perfil_usuario;

-- Recreate base select policy avoiding recursion by using SECURITY DEFINER functions
CREATE POLICY "perfil_select" ON public.perfil_usuario
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR
    public.is_admin() OR
    public.is_dp()
  );

-- Fix parcelas_vales policy to securely allow DP users to query it
DROP POLICY IF EXISTS "DP pode visualizar parcelas de vales" ON public.parcelas_vales;

CREATE POLICY "DP pode visualizar parcelas de vales" ON public.parcelas_vales
  FOR SELECT TO authenticated
  USING (
    public.is_dp()
  );

-- Fix chamados policy to securely allow DP users to query it
DROP POLICY IF EXISTS "DP pode visualizar chamados" ON public.chamados;

CREATE POLICY "DP pode visualizar chamados" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    public.is_dp()
  );
