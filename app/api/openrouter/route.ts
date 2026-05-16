import { NextRequest, NextResponse } from 'next/server'
import { checkUserAuth } from '@/lib/auth-utils'
import { sanitizeInput } from '@/lib/security'
import { ExternalAPIService } from '@/lib/external-api-service'

export const dynamic = 'force-dynamic'

const OPENROUTER_MODELS = [
  {
    name: "DeepSeek R1 0528 (free)",
    model: "deepseek/deepseek-r1-0528:free"
  },
  {
    name: "Google Gemini 2.5 Flash Image Preview (free)",
    model: "google/gemini-2.5-flash-image-preview:free"
  },
  {
    name: "OpenAI gpt-oss-120b (free)",
    model: "openai/gpt-oss-120b:free"
  },
  {
    name: "Google Gemini 2.5 Pro Experimental",
    model: "google/gemini-2.5-pro-exp-03-25"
  },
  {
    name: "Meta LLaMA 3.3 8B Instruct (free)",
    model: "meta-llama/llama-3.3-8b-instruct:free"
  }
]

export async function POST(request: NextRequest) {
  try {
    const authResult = await checkUserAuth()
    if (authResult.status !== 200) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const openRouterConfig = await ExternalAPIService.getOpenRouterConfig()
    const apiKey = openRouterConfig.apiKey
    if (!apiKey) {
      return NextResponse.json({ error: 'AI assistant is not configured' }, { status: 503 })
    }

    const { message, model } = await request.json()
    const normalizedMessage = sanitizeInput(typeof message === 'string' ? message : '').trim().slice(0, 4000)
    
    if (!normalizedMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Select model or use default
    const selectedModel =
      OPENROUTER_MODELS.find(m => m.model === model) ||
      OPENROUTER_MODELS.find(m => m.model === openRouterConfig.defaultModel) ||
      OPENROUTER_MODELS[0]

    const response = await fetch(ExternalAPIService.buildUrl(openRouterConfig.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel.model,
        messages: [{ role: 'user', content: normalizedMessage }],
        max_tokens: 1000
      }),
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.choices && data.choices.length > 0) {
      return NextResponse.json({
        response: data.choices[0].message.content,
        model: selectedModel.name
      })
    } else {
      return NextResponse.json({ error: 'No response from AI model' }, { status: 500 })
    }
  } catch (error) {
    console.error('OpenRouter API error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const openRouterConfig = await ExternalAPIService.getOpenRouterConfig()
  return NextResponse.json({
    enabled: Boolean(openRouterConfig.apiKey),
    models: OPENROUTER_MODELS.map(m => ({
      name: m.name,
      model: m.model
    }))
  })
}
