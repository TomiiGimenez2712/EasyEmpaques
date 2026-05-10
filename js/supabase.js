const SUPABASE_URL = 'https://yohvlxtcbkguwuokxpfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvaHZseHRjYmtndXd1b2t4cGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQyOTQsImV4cCI6MjA5MzIzMDI5NH0.hZjckZmpQWueqppHvh29dsE3VR5YKBXzbpMnsHVtffw';

// Inicializar cliente Supabase
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Función para verificar si hay conexión (intenta hacer una lectura mínima)
async function checkConnection() {
    console.log("Iniciando checkConnection...");
    try {
        console.log("Haciendo fetch a Supabase...");
        const { data, error } = await window.supabaseClient.from('conceptos_gastos').select('id').limit(1);
        if (error) throw error;
        console.log("Conectado a DB exitosamente.");
    } catch (err) {
        console.error("Error de conexión con Supabase detallado:", err);
        UI.error("Fallo de conexión a la Base de Datos. Revisa tu internet o los permisos de red. Detalles: " + err.message);
    }
}
