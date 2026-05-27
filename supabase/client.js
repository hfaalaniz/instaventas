/* ============================================================
   SUPABASE CLIENT — Instancia compartida
   Reemplazar SUPABASE_URL y SUPABASE_ANON_KEY con los valores
   de tu proyecto en https://app.supabase.com/project/_/settings/api
   ============================================================ */

const SUPABASE_URL      = window.ENV_SUPABASE_URL      || 'https://alvstmplxotmglcrbttw.supabase.co';
const SUPABASE_ANON_KEY = window.ENV_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdnN0bXBseG90bWdsY3JidHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODM5MDIsImV4cCI6MjA5NTA1OTkwMn0.CPYXBEmVTCvjYQw0D5bBPAjoUcBak_vLYpMHxm5OboU';

// El SDK de Supabase se carga via CDN en index.html (ver <script> tag)
const { createClient } = window.supabase;

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});

// Store ID del usuario activo (se llena en auth.js después del login)
let STORE_ID = null;

function setStoreId(id) { STORE_ID = id; }
function getStoreId()   { return STORE_ID; }

// Edge Function base URL
const FUNCTIONS_URL = SUPABASE_URL + '/functions/v1';
