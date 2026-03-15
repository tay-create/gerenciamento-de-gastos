import { createClient } from '@supabase/supabase-js';

// Hardcode de Chaves (Seguro pois são Anon Públicas do Supabase)
const SUPABASE_URL = 'https://tcliktsvpttxdnuzkeum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbGlrdHN2cHR0eGRudXprZXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTc5NDYsImV4cCI6MjA4OTE3Mzk0Nn0.wSt1CH2YOniSzI0mdQg6Uqx5dN2qHbVN-fiATl8JZVw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
