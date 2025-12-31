import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Pricing per 1 Million Tokens
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash-lite':    { input: 0.80, output: 3.20 },
  'gemini-2.5-flash':         { input: 2.40, output: 20.00 },
  'gemini-3-flash-preview':   { input: 4.00, output: 24.00 },
  'gemini-2.5-pro':           { input: 10.00, output: 80.00 },
  'gemini-3-pro-preview':     { input: 16.00, output: 96.00 } 
}
const DEFAULT_PRICING = { input: 2.40, output: 20.00 };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const sbUrl = Deno.env.get('SUPABASE_URL')
    const sbAnon = Deno.env.get('SUPABASE_ANON_KEY')
    const sbService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) throw new Error("Missing Authorization Header")

    const supabaseClient = createClient(sbUrl!, sbAnon!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error("User validation failed")

    // --- INPUTS ---
    const { question_id, question, options, official_answer, type, model } = await req.json()
    const modelKey = model || 'gemini-2.5-flash';
    const supabaseAdmin = createClient(sbUrl!, sbService!, { auth: { persistSession: false } })

    // --- PREPARE PROMPT (We do this early now to measure input size for legacy cache) ---
    const promptText = `
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
        
        Keep it concise, professional, and academic. Use bullet points and ordered lists to help with communication if needed.`;

    // --- STEP 1: CHECK IF USER HAS ALREADY PAID FOR THIS ---
    const { data: existingLog } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('question_id', String(question_id))
      .eq('model', modelKey)
      .limit(1)
      .maybeSingle();

    const hasPaidBefore = !!existingLog;

    // --- STEP 2: CHECK GLOBAL CACHE ---
    const { data: cachedData } = await supabaseAdmin
      .from('ai_analysis_cache')
      .select('*')
      .eq('question_id', String(question_id))
      .eq('model_used', modelKey)
      .maybeSingle()

    let analysisText = ''
    let source = ''
    let finalCost = 0
    let tokens = { input: 0, output: 0, thinking: 0 }
    
    const calculateCost = (inTok: number, outTok: number) => {
       const p = MODEL_PRICING[modelKey] || DEFAULT_PRICING;
       return ((inTok / 1_000_000) * p.input) + ((outTok / 1_000_000) * p.output);
    }

    if (cachedData) {
        analysisText = cachedData.analysis_text;
        
        // --- LOGIC FIX FOR LEGACY CACHE ---
        // If cache exists but has 0 tokens, we ESTIMATE them so we can bill the user.
        // Rule of thumb: 1 token ~= 4 characters
        const savedInput = cachedData.input_tokens || 0;
        const savedOutput = cachedData.output_tokens || 0;

        if (savedInput === 0 || savedOutput === 0) {
            // Estimate!
            tokens.input = Math.ceil(promptText.length / 4);
            tokens.output = Math.ceil(analysisText.length / 4);
            tokens.thinking = 0;

            // Optional: Update the cache so next time it's accurate
            // We do this without await so we don't slow down the response
            supabaseAdmin.from('ai_analysis_cache').update({
                input_tokens: tokens.input,
                output_tokens: tokens.output
            }).eq('id', cachedData.id).then();

        } else {
            tokens = { 
                input: savedInput, 
                output: savedOutput,
                thinking: cachedData.thinking_tokens || 0
            };
        }

        if (hasPaidBefore) {
            source = 'purchased_cache';
            finalCost = 0;
        } else {
            source = 'global_cache_billed';
            finalCost = calculateCost(tokens.input, tokens.output);
            
            await supabaseAdmin.from('ai_usage_logs').insert({
                user_id: user.id,
                question_id: String(question_id),
                result_source: source,
                model: modelKey,
                input_tokens: tokens.input,
                output_tokens: tokens.output,
                thinking_tokens: tokens.thinking,
                cost: finalCost
            });
        }
    } else {
        // SCENARIO C: Not Cached -> CALL API
        const genAI = new GoogleGenerativeAI(geminiKey!)
        const aiModel = genAI.getGenerativeModel({ model: modelKey })
        
        // Use the promptText we defined at the top
        const result = await aiModel.generateContent(promptText)
        const response = await result.response;
        analysisText = response.text();
        source = 'api';
        
        const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
        tokens.input = usage.promptTokenCount ?? 0;
        tokens.output = usage.candidatesTokenCount ?? 0;
        tokens.thinking = (usage as any).thoughts_token_count ?? 0;

        finalCost = calculateCost(tokens.input, tokens.output);

        await supabaseAdmin.from('ai_analysis_cache').upsert({
            question_id: String(question_id),
            analysis_text: analysisText,
            model_used: modelKey,
            input_tokens: tokens.input,
            output_tokens: tokens.output,
            thinking_tokens: tokens.thinking
        }, { onConflict: 'question_id, model_used'})

        await supabaseAdmin.from('ai_usage_logs').insert({
            user_id: user.id,
            question_id: String(question_id),
            result_source: source,
            model: modelKey,
            input_tokens: tokens.input,
            output_tokens: tokens.output,
            thinking_tokens: tokens.thinking,
            cost: finalCost
        });
    }

    return new Response(JSON.stringify({ 
      analysis: analysisText, 
      source, 
      cost: finalCost,
      tokens
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})