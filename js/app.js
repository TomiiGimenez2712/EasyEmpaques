window.appData = {
    plantilla_productos: []
};

window.app = {
    toggleSidebar: function() {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    },
    closeSidebar: function() {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (!sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }
    },
    setupAuth: async function() {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        this.handleAuthState(session);

        window.supabaseClient.auth.onAuthStateChange((_event, session) => {
            this.handleAuthState(session);
        });
    },
    handleAuthState: function(session) {
        const loginView = document.getElementById('login-view');
        const mainSidebar = document.getElementById('app-sidebar');
        const mainContent = document.querySelector('main');

        if (session) {
            // Logueado
            loginView.classList.add('hidden');
            mainSidebar.classList.remove('hidden');
            mainContent.classList.remove('hidden');
            if(window.innerWidth >= 768) mainSidebar.style.display = 'flex'; // Fix para responsive
            
            this.initApp();
        } else {
            // No logueado
            loginView.classList.remove('hidden');
            mainSidebar.classList.add('hidden');
            mainContent.classList.add('hidden');
            mainSidebar.style.display = ''; 
        }
    },
    login: async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('btn-login');
        const errorDiv = document.getElementById('login-error');
        
        btn.disabled = true;
        btn.textContent = 'Iniciando...';
        errorDiv.classList.add('hidden');

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        btn.disabled = false;
        btn.textContent = 'Ingresar';

        if (error) {
            errorDiv.textContent = 'Correo o contraseña incorrectos.';
            errorDiv.classList.remove('hidden');
        }
    },
    logout: async function() {
        await window.supabaseClient.auth.signOut();
    },
    initApp: async function() {
        if(this.initialized) return;
        this.initialized = true;

        // 1. Verificar conexión a BD (No bloqueante)
        if(typeof checkConnection !== 'undefined') checkConnection();

        // 2. Cargar vista inicial inmediatamente (según hash o dashboard)
        const initialView = window.location.hash.replace('#', '') || 'dashboard';
        loadView(initialView);

        // 3. Cargar plantilla global (En segundo plano)
        try {
            const { data, error } = await window.supabaseClient.from('plantilla_productos').select('*').order('orden', {ascending: true});
            if (data && !error) {
                window.appData.plantilla_productos = data;
                // Si la vista actual es 'lotes' o 'ventas', refrescar para usar la plantilla cargada
                const currentView = window.location.hash.replace('#', '') || 'dashboard';
                if (currentView === 'lotes' || currentView === 'ventas') {
                    triggerModuleInit(currentView);
                }
            }
        } catch (e) {
            console.error("Error cargando plantilla:", e);
        }

        // 4. Configurar navegación
        setupNavigation();

        // 5. Configurar tablas responsivas
        setupResponsiveTables();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    app.setupAuth();
});

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.dataset.view;
            window.location.hash = targetView;
            loadView(targetView);
            window.app.closeSidebar();
        });
    });

    // Soporte para botones atrás/adelante del navegador
    window.addEventListener('hashchange', () => {
        const targetView = window.location.hash.replace('#', '') || 'dashboard';
        loadView(targetView);
    });
}

function loadView(viewName) {
    // UI: Actualizar links activos
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(l => {
        l.classList.remove('active', 'text-brand-600', 'bg-brand-50');
        l.classList.add('text-gray-500');
        if (l.dataset.view === viewName) {
            l.classList.remove('text-gray-500');
            l.classList.add('active', 'text-brand-600', 'bg-brand-50');
        }
    });

    // Ocultar todas las vistas actuales
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    
    // Si la vista ya existe en el DOM, mostrarla
    let viewEl = document.getElementById(`view-${viewName}`);
    
    if (viewEl) {
        viewEl.classList.add('active');
        
        // Disparar inicialización del módulo correspondiente
        triggerModuleInit(viewName);
    } else {
        createPlaceholderView(viewName);
    }
}

function triggerModuleInit(viewName) {
    console.log(`Inicializando módulo: ${viewName}`);
    try {
        switch(viewName) {
            case 'dashboard':
                if (typeof dashboard !== 'undefined') dashboard.init();
                break;
            case 'lotes':
                if (typeof lotes !== 'undefined') lotes.loadLotes();
                break;
            case 'ventas':
                if (typeof ventas !== 'undefined') ventas.init();
                break;
            case 'liquidaciones':
                if (typeof liquidaciones !== 'undefined') liquidaciones.init();
                break;
            case 'cuentas':
                if (typeof cuentas !== 'undefined') cuentas.init();
                break;
            case 'quinteros':
            case 'clientes':
            case 'gastos':
                if (typeof catalogs !== 'undefined') catalogs.init();
                break;
            case 'ganancias':
                if (typeof ganancias !== 'undefined') ganancias.init();
                break;
        }
    } catch (err) {
        console.error(`Error al inicializar el módulo ${viewName}:`, err);
    }
}

function createPlaceholderView(viewName) {
    const container = document.getElementById('app-container');
    const viewDiv = document.createElement('div');
    viewDiv.id = `view-${viewName}`;
    viewDiv.className = 'view-section active animate-fade-in';
    
    let title = viewName.charAt(0).toUpperCase() + viewName.slice(1);
    
    viewDiv.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">${title}</h2>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>El módulo de ${title} está en construcción o no fue encontrado.</p>
        </div>
    `;
    
    container.appendChild(viewDiv);
}

function setupResponsiveTables() {
    // Aplicar a las tablas iniciales
    applyTableLabels();

    // Observar cambios en el DOM para aplicar labels a nuevas filas dinámicas
    const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        for (const m of mutations) {
            if (m.addedNodes.length > 0) {
                for (const node of m.addedNodes) {
                    if (node.nodeName === 'TR' || (node.querySelector && node.querySelector('tr'))) {
                        shouldUpdate = true;
                        break;
                    }
                }
            }
            if (shouldUpdate) break;
        }
        
        if (shouldUpdate) {
            applyTableLabels();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function applyTableLabels() {
    const tables = document.querySelectorAll('.responsive-table-wrapper table');
    tables.forEach(table => {
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim() || 'Acción');
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const firstCell = row.querySelector('td');
            // Ignorar filas de carga o vacías con colspan
            if (firstCell && firstCell.hasAttribute('colspan')) return;
            
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (headers[index] && !cell.hasAttribute('data-label')) {
                    cell.setAttribute('data-label', headers[index]);
                }
            });
        });
    });
}

