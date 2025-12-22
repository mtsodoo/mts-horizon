// Re-export from customSupabaseClient to avoid multiple GoTrueClient instances
import customSupabaseClient, { supabase } from './customSupabaseClient';

export { supabase };
export default customSupabaseClient;