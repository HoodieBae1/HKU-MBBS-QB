// supabase/functions/gemini-tutor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question_id, question, options, official_answer, type } = await req.json()

    // --- 1. SETUP SUPABASE CLIENT ---
    // We use the Service Role Key to bypass RLS so we can WRITE to the cache table
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- 2. CHECK CACHE FIRST ---
    const { data: cachedData } = await supabaseAdmin
      .from('ai_analysis_cache')
      .select('analysis_text')
      .eq('question_id', String(question_id))
      .single()

    if (cachedData) {
      console.log(`Cache hit for QID: ${question_id}`)
      return new Response(JSON.stringify({ analysis: cachedData.analysis_text, source: 'cache' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- 3. CACHE MISS? CALL GEMINI ---
    console.log(`Cache miss for QID: ${question_id}. Calling Gemini...`)
    
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('Missing Gemini API Key')

    const MODEL_NAME = "gemini-2.5-flash"
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: MODEL_NAME })

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
      
      Keep it concise, professional, and academic. Use bullet points and ordered lists to help with communication if needed.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // --- 4. SAVE TO CACHE ---
    // We save it asynchronously (don't block the user response if this fails slightly)
    const { error: insertError } = await supabaseAdmin
      .from('ai_analysis_cache')
      .insert({
        question_id: String(question_id),
        analysis_text: text,
        model_used: MODEL_NAME
      })
    
    if (insertError) console.error("Failed to cache:", insertError)

    return new Response(JSON.stringify({ analysis: text, source: 'api' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})