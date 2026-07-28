import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Check if caller is admin
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabaseAdmin
      .from('perfil_usuario')
      .select('tipo_usuario')
      .eq('id', user.id)
      .single()

    if (profile?.tipo_usuario !== 'admin') {
      throw new Error('Forbidden: Only admins can perform this action')
    }

    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const {
        email,
        nome_completo,
        tipo_usuario,
        ativo,
        whatsapp,
        endereco,
        departamento,
        garagem,
        registro,
      } = body

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'HelpdeskUser@123', // Default initial password
        email_confirm: true,
        user_metadata: { full_name: nome_completo },
      })

      if (createError) throw createError

      const updateData: any = { tipo_usuario, nome_completo }
      if (ativo !== undefined) updateData.ativo = ativo
      if (whatsapp !== undefined) updateData.whatsapp = whatsapp
      if (endereco !== undefined) updateData.endereco = endereco
      if (departamento !== undefined) updateData.departamento = departamento
      if (garagem !== undefined) updateData.garagem = garagem
      if (registro !== undefined) updateData.registro = registro

      // Update profile created by the database trigger
      const { error: updateError } = await supabaseAdmin
        .from('perfil_usuario')
        .update(updateData)
        .eq('id', newUser.user.id)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      const {
        userId,
        nome_completo,
        tipo_usuario,
        ativo,
        whatsapp,
        endereco,
        departamento,
        garagem,
        registro,
      } = body

      const updateData: any = {}
      if (nome_completo !== undefined) updateData.nome_completo = nome_completo
      if (tipo_usuario !== undefined) updateData.tipo_usuario = tipo_usuario
      if (ativo !== undefined) updateData.ativo = ativo
      if (whatsapp !== undefined) updateData.whatsapp = whatsapp
      if (endereco !== undefined) updateData.endereco = endereco
      if (departamento !== undefined) updateData.departamento = departamento
      if (garagem !== undefined) updateData.garagem = garagem
      if (registro !== undefined) updateData.registro = registro

      const { error: updateError } = await supabaseAdmin
        .from('perfil_usuario')
        .update(updateData)
        .eq('id', userId)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const { userId } = body

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'change_password') {
      const { userId, newPassword } = body

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      })

      if (updateError) throw updateError

      const { error: auditError } = await supabaseAdmin.from('auditoria_admin').insert({
        admin_id: user.id,
        usuario_id: userId,
        acao: 'alteracao_senha',
      })

      if (auditError) console.error('Erro ao registrar auditoria:', auditError)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Invalid action')
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
