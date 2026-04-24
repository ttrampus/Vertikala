// supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Re-initialize session after Vite HMR so auth isn't lost on hot reload
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    supabase.auth.startAutoRefresh()
  })
}