-- Drop the restricted policy that prevented users from seeing other profiles
DROP POLICY IF EXISTS "perfil_select" ON public.perfil_usuario;

-- Create an open policy so users can see names of ticket creators and other responsibles
CREATE POLICY "perfil_select" ON public.perfil_usuario
  FOR SELECT TO authenticated USING (true);
