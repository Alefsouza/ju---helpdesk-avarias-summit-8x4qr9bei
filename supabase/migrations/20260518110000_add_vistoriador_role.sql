-- Drop the existing constraint
ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;

-- Add the new constraint with 'vistoriador'
ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_tipo_usuario_check 
  CHECK (tipo_usuario = ANY (ARRAY['basico'::text, 'responsavel'::text, 'admin'::text, 'vistoriador'::text]));

-- Create helper function
CREATE OR REPLACE FUNCTION public.is_vistoriador()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'vistoriador'
  );
END;
$$;
