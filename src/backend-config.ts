const environment = import.meta.env || {};
export const isSupabaseEnabled = Boolean(
  environment.VITE_SUPABASE_URL &&
  (environment.VITE_SUPABASE_ANON_KEY || environment.VITE_SUPABASE_PUBLISHABLE_KEY),
);
