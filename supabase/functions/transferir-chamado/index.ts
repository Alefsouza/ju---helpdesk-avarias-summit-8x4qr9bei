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

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { chamado_id, novo_responsavel_id, observacao } = await req.json()

    if (!chamado_id || !novo_responsavel_id) {
      throw new Error('Missing required fields')
    }

    const { data: profile } = await supabaseAdmin
      .from('perfil_usuario')
      .select('tipo_usuario')
      .eq('id', user.id)
      .single()

    const isPrivileged =
      profile?.tipo_usuario === 'admin' ||
      profile?.tipo_usuario === 'sinistro' ||
      profile?.tipo_usuario === 'juridico'

    if (!isPrivileged && profile?.tipo_usuario !== 'responsavel') {
      throw new Error(
        'Forbidden: Only admin, responsavel, sinistro, or juridico can perform this action',
      )
    }

    const { data: chamado, error: chamadoError } = await supabaseAdmin
      .from('chamados')
      .select('responsavel_id, status')
      .eq('id', chamado_id)
      .single()

    if (chamadoError || !chamado) {
      throw new Error('Chamado not found')
    }

    if (!isPrivileged && chamado.responsavel_id !== user.id) {
      throw new Error('Forbidden: You are not the responsible for this ticket')
    }

    const { data: novoResponsavel, error: novoRespError } = await supabaseAdmin
      .from('perfil_usuario')
      .select('nome_completo, departamento')
      .eq('id', novo_responsavel_id)
      .single()

    if (novoRespError || !novoResponsavel) {
      throw new Error('Novo responsável não encontrado')
    }

    const { error: updateError } = await supabaseAdmin
      .from('chamados')
      .update({
        responsavel_id: novo_responsavel_id,
        status_interno: novoResponsavel.departamento || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', chamado_id)

    if (updateError) throw updateError

    const detalhes = observacao?.trim()
      ? `Transferido para ${novoResponsavel.nome_completo}. Motivo: ${observacao}`
      : `Transferido para ${novoResponsavel.nome_completo}.`

    const { error: historyError } = await supabaseAdmin.from('historico_chamado').insert({
      chamado_id,
      acao: 'transferido',
      usuario_id: user.id,
      detalhes,
    })

    if (historyError) {
      console.error('Error inserting history:', historyError)
    }

    const shortId = chamado_id.split('-')[0].toUpperCase()

    const { error: notifError } = await supabaseAdmin.from('notificacoes').insert({
      usuario_id: novo_responsavel_id,
      titulo: 'Chamado Transferido',
      mensagem: `O chamado #${shortId} foi transferido para sua responsabilidade.`,
      link: `/dashboard/chamados/${chamado_id}`,
      lida: false,
    })

    if (notifError) {
      console.error('Error inserting transfer notification:', notifError)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
