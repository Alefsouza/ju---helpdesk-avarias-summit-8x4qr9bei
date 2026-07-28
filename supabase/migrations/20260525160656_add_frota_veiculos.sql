DO $block$
BEGIN
  -- Create frota_veiculos table
  CREATE TABLE IF NOT EXISTS public.frota_veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prefixo TEXT UNIQUE NOT NULL,
    placa TEXT,
    garagem TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Add garagem column to chamados
  ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS garagem TEXT;
END $block$;

-- RLS for frota_veiculos
ALTER TABLE public.frota_veiculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "frota_select" ON public.frota_veiculos;
CREATE POLICY "frota_select" ON public.frota_veiculos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "frota_insert" ON public.frota_veiculos;
CREATE POLICY "frota_insert" ON public.frota_veiculos
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR (auth.jwt() ->> 'email') = 'ti@viasudeste.com');

DROP POLICY IF EXISTS "frota_update" ON public.frota_veiculos;
CREATE POLICY "frota_update" ON public.frota_veiculos
  FOR UPDATE TO authenticated USING (is_admin() OR (auth.jwt() ->> 'email') = 'ti@viasudeste.com') WITH CHECK (is_admin() OR (auth.jwt() ->> 'email') = 'ti@viasudeste.com');

DROP POLICY IF EXISTS "frota_delete" ON public.frota_veiculos;
CREATE POLICY "frota_delete" ON public.frota_veiculos
  FOR DELETE TO authenticated USING (is_admin() OR (auth.jwt() ->> 'email') = 'ti@viasudeste.com');

-- Update chamados RLS policies to support the new garagem routing
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    (chamados.usuario_id = auth.uid()) OR 
    (chamados.responsavel_id = auth.uid()) OR 
    is_admin() OR 
    is_responsavel() OR 
    is_sos() OR 
    is_coc() OR 
    is_juridico() OR 
    (is_sinistro() AND (
      ((SELECT perfil_usuario.garagem FROM public.perfil_usuario WHERE (perfil_usuario.id = auth.uid())) IS NOT NULL) AND 
      ((SELECT perfil_usuario.garagem FROM public.perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(chamados.garagem, (SELECT perfil_usuario.garagem FROM public.perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id))))
    ))
  );

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    (chamados.usuario_id = auth.uid()) OR 
    (chamados.responsavel_id = auth.uid()) OR 
    is_admin() OR 
    is_sos() OR 
    is_coc() OR 
    (((chamados.status = 'aberto'::text) OR (chamados.status = 'finalizado'::text)) AND (
      is_responsavel() OR 
      is_juridico() OR 
      (is_sinistro() AND (
        (SELECT perfil_usuario.garagem FROM public.perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(chamados.garagem, (SELECT perfil_usuario.garagem FROM public.perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id)))
      ))
    ))
  )
  WITH CHECK (
    (chamados.usuario_id = auth.uid()) OR 
    (chamados.responsavel_id = auth.uid()) OR 
    is_admin() OR 
    is_sos() OR 
    is_coc() OR 
    (((chamados.status = 'aberto'::text) OR (chamados.status = 'finalizado'::text)) AND (
      is_responsavel() OR 
      is_juridico() OR 
      (is_sinistro() AND (
        (SELECT perfil_usuario.garagem FROM public.perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(chamados.garagem, (SELECT perfil_usuario.garagem FROM public.perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id)))
      ))
    ))
  );

-- Seed ti@viasudeste.com user
DO $block$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ti@viasudeste.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'ti@viasudeste.com',
      crypt('Skip@Pass123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "TI Via Sudeste"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario, garagem)
    VALUES (new_user_id, 'ti@viasudeste.com', 'TI Via Sudeste', 'admin', NULL)
    ON CONFLICT (id) DO UPDATE SET tipo_usuario = 'admin';
  ELSE
    UPDATE public.perfil_usuario 
    SET tipo_usuario = 'admin' 
    WHERE email = 'ti@viasudeste.com';
  END IF;
END $block$;
