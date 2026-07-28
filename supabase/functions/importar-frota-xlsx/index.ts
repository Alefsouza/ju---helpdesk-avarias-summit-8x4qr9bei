import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as XLSX from 'npm:xlsx@0.18.5'
import { corsHeaders } from '../_shared/cors.ts'

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

    if (user.email !== 'ti@viasudeste.com') {
      throw new Error('Forbidden: Restrito ao administrador TI')
    }

    const { fileBase64 } = await req.json()
    if (!fileBase64) throw new Error('O arquivo não foi fornecido.')

    // Decode base64 into Uint8Array to be parsed by XLSX
    const binaryString = atob(fileBase64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const workbook = XLSX.read(bytes, { type: 'array' })
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('O arquivo não contém planilhas.')
    }

    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // defval: '' ensures empty cells don't break key matching
    const data: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

    if (!data || data.length === 0) {
      throw new Error('A planilha está vazia ou sem dados válidos.')
    }

    const veiculos = []

    for (const row of data) {
      let prefixo = null
      let placa = null
      let garagem = null

      for (const key of Object.keys(row)) {
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes('prefixo') || lowerKey.includes('carro')) {
          prefixo = String(row[key])
        }
        if (lowerKey.includes('placa')) {
          placa = String(row[key])
        }
        if (lowerKey.includes('garagem')) {
          garagem = String(row[key])
        }
      }

      // Valid prefix checks
      if (prefixo && prefixo.trim()) {
        veiculos.push({
          prefixo: prefixo.trim(),
          placa: placa && placa.trim() ? placa.trim() : null,
          garagem: garagem && garagem.trim() ? garagem.trim() : 'Desconhecida',
        })
      }
    }

    if (veiculos.length === 0) {
      throw new Error(
        'Nenhum veículo válido encontrado. Certifique-se que existam colunas com o nome "Prefixo" e "Garagem".',
      )
    }

    // Upsert in batches of 500 to avoid statement timeouts
    for (let i = 0; i < veiculos.length; i += 500) {
      const chunk = veiculos.slice(i, i + 500)
      const { error } = await supabaseAdmin
        .from('frota_veiculos')
        .upsert(chunk, { onConflict: 'prefixo' })

      if (error) {
        console.error('Upsert Error:', error)
        throw new Error('Erro ao salvar os veículos no banco de dados. Verifique os dados.')
      }
    }

    return new Response(JSON.stringify({ success: true, count: veiculos.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
