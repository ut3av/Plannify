import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://copxalwvneaykicqnqsq.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_-AMdUi3nhKYG6WkB-N38UA_hb7splzs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
