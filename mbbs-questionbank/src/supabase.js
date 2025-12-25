import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS
const supabaseUrl = 'https://qzoreybelgjynenkwobi.supabase.co';
const supabaseAnonKey = 'sb_publishable_nkipk93S73NTUOxty8MHeg_DTpQPcXf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);