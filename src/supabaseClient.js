import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ctbjoouhsussddekgvje.supabase.co'
// Sanitize URL by removing /rest/v1 or trailing slashes if user pasted REST endpoint
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0Ympvb3Voc3Vzc2RkZWtndmplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MzQzNDUsImV4cCI6MjEwMjMxMDM0NX0.cpZTsCHoDcSmRIEjin46jM8PZLyECH7Ho_9im4T2EoE'
const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || fallbackKey).trim()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Isolated client without session persistence for admin direct account provisioning
export const provisioningAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'supabase_provisioning_temp',
  },
})
