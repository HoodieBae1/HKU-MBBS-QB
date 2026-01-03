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

    // 1. Client for Auth Verification
    const supabaseClient = createClient(sbUrl!, sbAnon!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: authHeader } }
    })
    
    // 2. Admin Client for Database Operations
    const supabaseAdmin = createClient(sbUrl!, sbService!, { auth: { persistSession: false } })

    // 3. Verify User
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error("Unauthorized: Invalid Token")

    // 4. Fetch User Profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier, ai_credit_balance, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) throw new Error("Profile not found")

    // --- INPUTS ---
    const { question_id, question, options, official_answer, type, model } = await req.json()
    const modelKey = model || 'gemini-2.5-flash';

    // --- STEP 1: CHECK IF USER HAS ALREADY PAID ---
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
    // We fetch this early now.
    const { data: cachedData } = await supabaseAdmin
      .from('ai_analysis_cache')
      .select('*')
      .eq('question_id', String(question_id))
      .eq('model_used', modelKey)
      .maybeSingle()

    // --- [NEW] EARLY EXIT OPTIMIZATION ---
    // If they paid before AND we have the data, return immediately.
    // DO NOT logging a new row. DO NOT check wallet.
    if (hasPaidBefore && cachedData) {
        return new Response(JSON.stringify({ 
            analysis: cachedData.analysis_text, 
            source: 'purchased_cache_view', // Special flag so UI knows
            cost: 0,
            tokens: { 
                input: cachedData.input_tokens || 0, 
                output: cachedData.output_tokens || 0, 
                thinking: cachedData.thinking_tokens || 0 
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // ========================================================================
    // IF WE REACH HERE, IT MEANS EITHER:
    // 1. User hasn't paid.
    // 2. OR User paid, but cache was deleted (Edge case: we will regenerate cost-free).
    // ========================================================================

    // --- STEP 3: CHECK USAGE & BALANCE (For New Purchases Only) ---
    let isFreeTrialHit = false;
    const isStandard = profile.subscription_tier === 'standard';
    const isTrial = profile.subscription_status === 'trial';

    if (!hasPaidBefore) {
        const { count: usageCount } = await supabaseAdmin
            .from('ai_usage_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
        const currentUsage = usageCount || 0;
        
        isFreeTrialHit = isStandard && isTrial && currentUsage < 2;

        if (isStandard && !isFreeTrialHit && (profile.ai_credit_balance || 0) <= 0) {
            throw new Error(isTrial 
                ? "Trial limit reached (2/2). Please upgrade to continue." 
                : "Insufficient AI Credits. Please top up.")
        }
    }

    // --- STEP 4: GENERATE CONTENT (If not in cache) ---
    let analysisText = ''
    let source = ''
    let tokens = { input: 0, output: 0, thinking: 0 }
    
    // We only generate prompt if we actually need to call API or fix legacy cache
    const promptText = `
        You are an expert medical professor at HKU (University of Hong Kong).
        Analyze this medical finals question.

        Question: "${question}"
        ${type === 'MCQ' ? `Options: \n${options.map((o: any, i: number) => `${String.fromCharCode(65+i)}. ${o}`).join('\n')}` : ''}
        Goddisk Answer: "${official_answer}"

        Provide a response with this exact structure:
        1. **Goddisk Answer Analysis**: Agree or disagree with the goddisk answer.
        2. **Pathophysiology/Mechanism**: Explain your thought process into why the answer is correct or incorrect.
        3. **Why others are wrong** (If MCQ): Brief dismissal of distractors.
        4. **Clinical Pearl**: A high-yield fact or mnemonic.
        
        Keep it concise, professional, and academic.`;

    if (cachedData) {
        // If we are here, it means hasPaidBefore is FALSE (New Purchase from Cache)
        // OR legacy cache fix needed
        analysisText = cachedData.analysis_text;
        source = 'cache'; 
        
        const savedInput = cachedData.input_tokens || 0;
        const savedOutput = cachedData.output_tokens || 0;
        if (savedInput === 0 || savedOutput === 0) {
            tokens.input = Math.ceil(promptText.length / 4);
            tokens.output = Math.ceil(analysisText.length / 4);
            supabaseAdmin.from('ai_analysis_cache').update({
                input_tokens: tokens.input,
                output_tokens: tokens.output
            }).eq('id', cachedData.id).then();
        } else {
            tokens = { input: savedInput, output: savedOutput, thinking: cachedData.thinking_tokens || 0 };
        }
    } else {
        // API CALL
        const genAI = new GoogleGenerativeAI(geminiKey!)
        const aiModel = genAI.getGenerativeModel({ model: modelKey })
        const result = await aiModel.generateContent(promptText)
        const response = await result.response;
        analysisText = response.text();
        source = 'api';
        
        const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
        tokens.input = usage.promptTokenCount ?? 0;
        tokens.output = usage.candidatesTokenCount ?? 0;
        tokens.thinking = (usage as any).thoughts_token_count ?? 0;

        await supabaseAdmin.from('ai_analysis_cache').upsert({
            question_id: String(question_id),
            analysis_text: analysisText,
            model_used: modelKey,
            input_tokens: tokens.input,
            output_tokens: tokens.output,
            thinking_tokens: tokens.thinking
        }, { onConflict: 'question_id, model_used'})
    }

    // --- STEP 5: BILLING ---
    const calculateRealCost = (inTok: number, outTok: number) => {
       const p = MODEL_PRICING[modelKey] || DEFAULT_PRICING;
       return ((inTok / 1_000_000) * p.input) + ((outTok / 1_000_000) * p.output);
    }

    const realUsdCost = calculateRealCost(tokens.input, tokens.output);
    let deductionAmount = 0;

    if (hasPaidBefore) {
        // Edge case: Paid before, but cache was missing, so we regenerated.
        // Cost is 0.
        deductionAmount = 0;
        source = 'purchased_regenerated'; 
    } else if (isFreeTrialHit) {
        deductionAmount = 0;
        source = 'trial_free';
    } else {
        const multiplier = isStandard ? 20 : 1;
        deductionAmount = realUsdCost * multiplier;
        if (source === 'cache') source = 'global_cache_billed';
    }

    // Standard User Wallet Check (for new purchases)
    if (isStandard && deductionAmount > 0 && (profile.ai_credit_balance - deductionAmount) < 0) {
        throw new Error(`Insufficient funds. Cost: $${deductionAmount.toFixed(4)}, Balance: $${profile.ai_credit_balance.toFixed(4)}`)
    }

    // --- STEP 6: DB LOGGING (Only for New Purchases or Regenerations) ---
    await supabaseAdmin.from('ai_usage_logs').insert({
        user_id: user.id,
        question_id: String(question_id),
        result_source: source,
        model: modelKey,
        input_tokens: tokens.input,
        output_tokens: tokens.output,
        thinking_tokens: tokens.thinking,
        cost: realUsdCost
    });

    if (deductionAmount > 0) {
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ ai_credit_balance: profile.ai_credit_balance - deductionAmount })
            .eq('id', user.id)
        if (updateError) console.error("Balance deduction failed", updateError)
    }

    return new Response(JSON.stringify({ 
      analysis: analysisText, 
      source, 
      cost: realUsdCost,
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