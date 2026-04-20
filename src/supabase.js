import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.vkqrbcyowakcnnqhceyi.supabase.co;
const supabaseKey = import.meta.env.sb_publishable_aeI9Lp8G41z7jikyJ3MOcw_2peTH6w5;

export const supabase = createClient(supabaseUrl, supabaseKey);