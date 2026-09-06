import { createClient, SupabaseClient } from "@supabase/supabase-js";

// The exported SuperCool project included a hardcoded managed database endpoint.
// The current game does not require a backend, so keep database access optional.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const db: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
export default db;
