import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS
export const supabaseUrl = 'https://qzoreybelgjynenkwobi.supabase.co';
export const supabaseAnonKey = 'sb_publishable_nkipk93S73NTUOxty8MHeg_DTpQPcXf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);