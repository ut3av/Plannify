import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ctbjoouhsussddekgvje.supabase.co'
// Sanitize URL by removing /rest/v1 or trailing slashes if user pasted REST endpoint
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || '').trim()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
