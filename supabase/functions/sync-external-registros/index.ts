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
    const baseUrl =
      Deno.env.get('REGISTROS_URL') ?? Deno.env.get('REGISTROS') ?? Deno.env.get('VITE_REGISTROS')

    if (!baseUrl) {
      throw new Error('URL de registros não configurada.')
    }

    let page = 1
    const limit = 2000
    let hasMore = true
    const processedMap = new Map<string, any>()

    while (hasMore) {
      let currentUrl = baseUrl
      if (currentUrl.includes('?')) {
        currentUrl += `&limit=${limit}&page=${page}&offset=${(page - 1) * limit}`
      } else {
        currentUrl += `?limit=${limit}&page=${page}&offset=${(page - 1) * limit}`
      }

      const res = await fetch(currentUrl)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for url: ${currentUrl}`)
      const parsed = await res.json()

      let items: any[] = []
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (Array.isArray(parsed.items)) {
          items = parsed.items
        } else {
          items = Object.entries(parsed).map(([key, value]) => ({ registro: key, nome: value }))
        }
      } else if (Array.isArray(parsed)) {
        items = parsed
      }

      if (items.length === 0) {
        hasMore = false
      } else {
        let newItemsAdded = 0

        for (const item of items) {
          if (!item || typeof item !== 'object') continue
          const keys = Object.keys(item)
          const registroKey = keys.find((k) => k.toLowerCase().trim() === 'registro')
          const nomeKey = keys.find((k) => k.toLowerCase().trim() === 'nome')

          if (!registroKey || !nomeKey) continue

          const regStr = String(item[registroKey]).trim()
          if (!regStr) continue

          const registroNormalized = regStr.replace(/^0+(?!$)/, '')
          if (!processedMap.has(registroNormalized)) {
            processedMap.set(registroNormalized, {
              registro: registroNormalized,
              nome: String(item[nomeKey]).trim(),
              atualizado_em: new Date().toISOString(),
            })
            newItemsAdded++
          }
        }

        // Se não adicionou itens novos (página de duplicatas) ou menor que o limite, fim dos dados
        if (newItemsAdded === 0 || items.length < limit) {
          hasMore = false
        } else {
          page++
        }
      }
    }

    const processed = Array.from(processedMap.values())

    if (processed.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum registro encontrado para sincronizar',
          count: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Batch upserts to avoid timeouts and payload size limits
    const BATCH_SIZE = 1000
    for (let i = 0; i < processed.length; i += BATCH_SIZE) {
      const batch = processed.slice(i, i + BATCH_SIZE)
      const { error: upsertError } = await supabaseAdmin
        .from('registros')
        .upsert(batch, { onConflict: 'registro' })

      if (upsertError) {
        console.error(`Bulk upsert error at batch ${i}:`, upsertError)
        throw new Error(
          `Erro ao salvar os registros no banco de dados (batch ${i}): ${upsertError.message}`,
        )
      }
    }

    return new Response(JSON.stringify({ success: true, count: processed.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Sync Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
