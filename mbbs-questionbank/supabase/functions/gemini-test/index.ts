import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const sbUrl = Deno.env.get('SUPABASE_URL')
    const sbAnon = Deno.env.get('SUPABASE_ANON_KEY')
    const sbService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    // 1. Get the Auth Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("Missing Authorization Header")
    }

    // 2. Validate User (STATELESS CONFIGURATION)
    // We add 'auth: { persistSession: false }' to stop the error you are seeing
    const supabaseClient = createClient(sbUrl!, sbAnon!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error("Auth Failed:", userError)
      throw new Error("User validation failed")
    }

    // 3. Parse Body
    const { question_id, question, options, official_answer, type } = await req.json()

    // 4. Admin Client (For Database Writes)
    const supabaseAdmin = createClient(sbUrl!, sbService!, {
      auth: { persistSession: false } 
    })

    // 5. Check Cache / Call Gemini
    let analysisText = ''
    let source = ''

    const { data: cachedData } = await supabaseAdmin
      .from('ai_analysis_cache')
      .select('analysis_text')
      .eq('question_id', String(question_id))
      .single()

    if (cachedData) {
      analysisText = cachedData.analysis_text
      source = 'cache'
    } else {
      const genAI = new GoogleGenerativeAI(geminiKey!)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
      
      const prompt = `
      You are an expert medical professor at HKU (University of Hong Kong).
      Analyze this medical finals question.

      Question: "${question}"
      ${type === 'MCQ' ? `Options: \n${options.map((o: any, i: number) => `${String.fromCharCode(65+i)}. ${o}`).join('\n')}` : ''}
      Official Answer: "${official_answer}"

      Provide a response with this exact structure:
      1. **Official Answer Analysis**: Agree or disagree with the official answer.
      2. **Pathophysiology/Mechanism**: Explain your thought process into why the answer is correct or incorrect.
      3. **Why others are wrong** (If MCQ): Brief dismissal of distractors.
      4. **Clinical Pearl**: A high-yield fact or mnemonic.
      
      Keep it concise, professional, and academic. Use bullet points and ordered lists to help with communication if needed.`
      const result = await model.generateContent(prompt)
      analysisText = await result.response.text()
      source = 'api'

      // Save to Cache (background)
      supabaseAdmin.from('ai_analysis_cache').insert({
        question_id: String(question_id),
        analysis_text: analysisText,
        model_used: "gemini-2.5-flash"
      }).then()
    }

    // 6. Log Usage
    await supabaseAdmin
      .from('ai_usage_logs')
      .insert({
        user_id: user.id,
        question_id: String(question_id),
        result_source: source
      })

    return new Response(JSON.stringify({ analysis: analysisText, source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})