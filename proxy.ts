// Proxy file intentionally left minimal.
//
// Supabase JS client stores auth sessions in localStorage, NOT cookies,
// so edge-level cookie checks don't work reliably for auth gating.
//
// Admin security is enforced by two layers instead:
// 1. Client-side: admin/page.tsx checks role === "admin" via supabase.auth.getSession()
//    and redirects non-admins before rendering any UI (blank screen until verified)
// 2. Database: Supabase RLS policies require get_my_role() = 'admin' for cross-user
//    data access — even if someone reaches the page, they can't read any data

export {};
