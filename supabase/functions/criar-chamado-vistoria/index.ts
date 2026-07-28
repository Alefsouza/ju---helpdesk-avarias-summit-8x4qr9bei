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

    const body = await req.json()
    const { documento } = body

    if (!documento || !documento.id || !documento.numero_os) {
      throw new Error('Documento inválido ou sem número de OS')
    }

    // 1. Identify garage
    let garagemToInsert = documento.garagem || null

    if (!garagemToInsert && documento.numero_carro) {
      const { data: veiculo } = await supabaseAdmin
        .from('frota_veiculos')
        .select('garagem')
        .eq('prefixo', documento.numero_carro.trim())
        .maybeSingle()
      if (veiculo?.garagem) {
        garagemToInsert = veiculo.garagem
      }
    }

    if (!garagemToInsert) {
      const { data: profile } = await supabaseAdmin
        .from('perfil_usuario')
        .select('garagem')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.garagem) {
        garagemToInsert = profile.garagem
      }
    }

    // 2. Format occurrence date (YYYY-MM-DD)
    let dataOcorrencia = documento.data
    if (!dataOcorrencia) {
      const now = new Date()
      dataOcorrencia = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0]
    } else {
      dataOcorrencia = dataOcorrencia.split('T')[0]
      if (dataOcorrencia.includes('/')) {
        const parts = dataOcorrencia.split('/')
        if (parts.length === 3) {
          dataOcorrencia = `${parts[2]}-${parts[1]}-${parts[0]}`
        }
      }
    }

    // 3. Create the ticket
    const titulo = `Avaria no carro ${documento.numero_carro || 'N/A'} - OS ${documento.numero_os}`
    const descricao = documento.descricao_danos || 'Sem descrição'

    const { data: novoChamado, error: chamadoError } = await supabaseAdmin
      .from('chamados')
      .insert({
        titulo,
        descricao,
        status: 'aberto',
        usuario_id: user.id,
        carro: documento.numero_carro || null,
        data_ocorrencia: dataOcorrencia,
        garagem: garagemToInsert,
      })
      .select('id')
      .single()

    if (chamadoError || !novoChamado) throw chamadoError || new Error('Erro ao criar chamado')

    const chamadoId = novoChamado.id

    // 4. Update document with chamado_id
    await supabaseAdmin.from('documentos').update({ chamado_id: chamadoId }).eq('id', documento.id)

    if (documento.formulario_id) {
      await supabaseAdmin
        .from('formularios_espelho_danos')
        .update({ chamado_id: chamadoId })
        .eq('id', documento.formulario_id)
    }

    // 3. Add PDF as internal attachment
    if (documento.arquivo_url) {
      await supabaseAdmin.from('anexos_chamado_interno').insert({
        chamado_id: chamadoId,
        usuario_id: user.id,
        nome_arquivo: documento.nome_arquivo || 'Espelho_Danos.pdf',
        arquivo_url: documento.arquivo_url,
        tipo_arquivo: 'application/pdf',
        tamanho_bytes: 0,
      })
    }

    // 4. Add photos as internal attachments
    let photoCounter = 1
    const photosToInsert = []

    if (documento.foto_url) {
      photosToInsert.push({
        chamado_id: chamadoId,
        usuario_id: user.id,
        nome_arquivo: `foto-${photoCounter}.jpg`,
        arquivo_url: documento.foto_url,
        tipo_arquivo: 'image/jpeg',
        tamanho_bytes: 0,
      })
      photoCounter++
    }

    if (Array.isArray(documento.fotos_urls)) {
      for (const url of documento.fotos_urls) {
        if (url) {
          photosToInsert.push({
            chamado_id: chamadoId,
            usuario_id: user.id,
            nome_arquivo: `foto-${photoCounter}.jpg`,
            arquivo_url: url,
            tipo_arquivo: 'image/jpeg',
            tamanho_bytes: 0,
          })
          photoCounter++
        }
      }
    }

    if (photosToInsert.length > 0) {
      await supabaseAdmin.from('anexos_chamado_interno').insert(photosToInsert)
    }

    return new Response(JSON.stringify({ success: true, chamado_id: chamadoId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Erro na edge function criar-chamado-vistoria:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
