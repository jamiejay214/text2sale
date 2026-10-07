import { createClient } from '@supabase/supabase-js'
import { boundedFetch } from './request-timeout'

// Keep static builds and design previews renderable when deployment secrets are
// not mounted. Real environments always override these public client values.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://build-placeholder.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "build-placeholder-anon-key"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: boundedFetch },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // supabase-js serializes every auth call behind navigator.locks. That lock
    // can deadlock — leaving sign-in hung forever on "Signing in…" even though
    // the auth request itself succeeded — when a prior auth op stalls or the
    // app is open in multiple tabs. This no-op lock runs the operation without
    // the cross-tab mutex, removing the deadlock. (Cross-tab session sync is
    // non-critical for this app; a rare multi-tab refresh race just re-logs in.)
    lock: <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => fn(),
  },
})
