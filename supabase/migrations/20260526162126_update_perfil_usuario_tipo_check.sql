ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;

ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_tipo_usuario_check 
  CHECK (tipo_usuario = ANY (ARRAY[
    'basico'::text, 
    'responsavel'::text, 
    'admin'::text, 
    'vistoriador'::text, 
    'coc'::text, 
    'sos'::text, 
    'juridico'::text, 
    'sinistro'::text, 
    'secretaria_tecnica'::text
  ]));
