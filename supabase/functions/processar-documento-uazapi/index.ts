import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { texto_documento, mensagem_padrao } = await req.json()

    if (!texto_documento) {
      throw new Error('O texto do documento é obrigatório para análise.')
    }

    // 1. Extrai possíveis números de telefone (RegEx para padrões comuns brasileiros)
    const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})/g
    const matches = texto_documento.match(phoneRegex) || []

    const validMobileNumbers = new Set<string>()
    const ignoredLandlines = new Set<string>()

    // 2. Lógica para distinguir entre fixos e celulares
    for (const rawNumber of matches) {
      const digits = rawNumber.replace(/\D/g, '')

      let dddAndNumber = digits
      if (dddAndNumber.startsWith('55') && dddAndNumber.length > 11) {
        dddAndNumber = dddAndNumber.substring(2)
      }

      // Regra Celular BR: 11 dígitos, inicia com 9 após o DDD (ex: 11 9 8765 4321)
      if (dddAndNumber.length === 11 && dddAndNumber.charAt(2) === '9') {
        validMobileNumbers.add('55' + dddAndNumber)
      }
      // Regra Fixo BR: 10 dígitos (ex: 11 3456 7890)
      else if (dddAndNumber.length === 10) {
        ignoredLandlines.add(dddAndNumber)
      }
    }

    const numbersToMessage = Array.from(validMobileNumbers)

    // 3. Integração UAZAPI (Suporte a múltiplos números)
    const UAZAPI_URL = Deno.env.get('UAZAPI_URL') || 'https://api.uazapi.com/v1/messages'
    const UAZAPI_KEY = Deno.env.get('UAZAPI_API_KEY') || 'dummy-key'

    const results = []

    // Tratamento sequencial em Promises para garantir que ambos sejam disparados com sucesso
    const dispatchPromises = numbersToMessage.map(async (phoneNumber) => {
      try {
        const res = await fetch(UAZAPI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${UAZAPI_KEY}`,
          },
          body: JSON.stringify({
            number: phoneNumber,
            text:
              mensagem_padrao || 'Análise de documento concluída. Entraremos em contato em breve.',
          }),
        })

        return {
          numero: phoneNumber,
          status: res.ok ? 'enviado' : 'falha',
          detalhe: res.ok
            ? 'Mensagem disparada com sucesso via UAZAPI'
            : 'Erro retornado pela API externa',
        }
      } catch (err) {
        return {
          numero: phoneNumber,
          status: 'erro',
          detalhe: String(err),
        }
      }
    })

    const dispatchResults = await Promise.all(dispatchPromises)
    results.push(...dispatchResults)

    return new Response(
      JSON.stringify({
        sucesso: true,
        analise: {
          total_numeros_extraidos: matches.length,
          celulares_validos_encontrados: numbersToMessage,
          telefones_fixos_ignorados: Array.from(ignoredLandlines),
        },
        envios_uazapi: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
