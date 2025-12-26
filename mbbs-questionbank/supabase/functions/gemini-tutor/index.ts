// supabase/functions/gemini-tutor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question, options, official_answer, type } = await req.json()

    // We will set this key in the Dashboard next
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('Missing API Key')

    const genAI = new GoogleGenerativeAI(apiKey)
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
      
      Keep it concise, professional, and academic. Use bullet points and ordered lists to help with communication if needed.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return new Response(JSON.stringify({ analysis: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})