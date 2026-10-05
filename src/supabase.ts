import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hseaymxhnrjlofaczkls.supabase.co'
const supabasePublishableKey = 'sb_publishable_jgzhAZwRvTmn3mh-zbVG3g_IoKdPDVo'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const projectUrl = supabaseUrl
