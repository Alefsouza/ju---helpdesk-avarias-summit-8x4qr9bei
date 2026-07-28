-- Fix RLS policy on perfil_usuario to allow all authenticated users to read profiles
-- This ensures that roles like Juridico, Admin, DP, etc., can see who created a ticket

DROP POLICY IF EXISTS "perfil_select" ON public.perfil_usuario;

CREATE POLICY "perfil_select" ON public.perfil_usuario
  FOR SELECT TO authenticated USING (true);
