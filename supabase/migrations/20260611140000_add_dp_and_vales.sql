DO $$
BEGIN
  -- Update check constraint for perfil_usuario
  ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;
  ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_tipo_usuario_check CHECK (tipo_usuario = ANY (ARRAY['basico', 'responsavel', 'admin', 'vistoriador', 'coc', 'sos', 'juridico', 'sinistro', 'secretaria_tecnica', 'dp']));
END $$;

CREATE TABLE IF NOT EXISTS public.parcelas_vales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  valor_parcela numeric NOT NULL,
  data_referencia date NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parcelas_vales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parcelas_vales_select" ON public.parcelas_vales;
CREATE POLICY "parcelas_vales_select" ON public.parcelas_vales
  FOR SELECT TO authenticated USING (
    is_admin() OR 
    (SELECT departamento FROM perfil_usuario WHERE id = auth.uid()) = 'Diretoria' OR
    (SELECT tipo_usuario FROM perfil_usuario WHERE id = auth.uid()) = 'dp'
  );

DROP POLICY IF EXISTS "parcelas_vales_insert" ON public.parcelas_vales;
CREATE POLICY "parcelas_vales_insert" ON public.parcelas_vales
  FOR INSERT TO authenticated WITH CHECK (
    is_admin() OR 
    (SELECT departamento FROM perfil_usuario WHERE id = auth.uid()) = 'Diretoria'
  );

-- Seed user 'dp'
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'financeiro@viasudeste.com') THEN
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
      'financeiro@viasudeste.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Financeiro DP"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario)
    VALUES (new_user_id, 'financeiro@viasudeste.com', 'Financeiro DP', 'dp')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
