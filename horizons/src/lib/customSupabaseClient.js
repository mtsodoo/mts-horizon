import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ycbplbsrzsuefeqlhxsx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYnBsYnNyenN1ZWZlcWxoeHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDc1NTgsImV4cCI6MjA3ODEyMzU1OH0.fLck_Col_tl8muRxT3DBLIUyDa9ZFRphGXWt-bdEaqc';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
