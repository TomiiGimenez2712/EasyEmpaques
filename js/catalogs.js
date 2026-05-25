const catalogs = {
    gastoTabActiva: 'Torito',
    gastosCargados: [],
    
    // --- Modals Management ---
    openQuinteroModal: function(id = null) {
        document.getElementById('form-quintero').reset();
        document.getElementById('quintero-id').value = '';
        document.getElementById('modal-quintero-title').textContent = id ? 'Editar Quintero' : 'Nuevo Quintero';
        
        if (id) {
            // Load existing data
            const btn = document.querySelector(`button[onclick="catalogs.openQuinteroModal(${id})"]`);
            if (btn) {
                const tr = btn.closest('tr');
                document.getElementById('quintero-id').value = id;
                document.getElementById('quintero-nombre').value = tr.children[0].textContent;
                document.getElementById('quintero-telefono').value = tr.children[1].textContent !== '-' ? tr.children[1].textContent : '';
                const estado = tr.children[2].textContent.toLowerCase();
                document.getElementById('quintero-estado').value = estado.includes('activo') && !estado.includes('inactivo') ? 'activo' : 'inactivo';
            }
        }
        
        document.getElementById('modal-quintero').classList.remove('hidden');
    },
    
    openClienteModal: function(id = null) {
        document.getElementById('form-cliente').reset();
        document.getElementById('cliente-id').value = '';
        document.getElementById('modal-cliente-title').textContent = id ? 'Editar Cliente' : 'Nuevo Cliente';
        
        if (id) {
            // Load existing data
            const btn = document.querySelector(`button[onclick="catalogs.openClienteModal(${id})"]`);
            if (btn) {
                const tr = btn.closest('tr');
                document.getElementById('cliente-id').value = id;
                document.getElementById('cliente-nombre').value = tr.children[0].textContent;
                document.getElementById('cliente-mercado').value = tr.children[1].textContent !== '-' ? tr.children[1].textContent : '';
                document.getElementById('cliente-telefono').value = tr.children[2].textContent !== '-' ? tr.children[2].textContent : '';
            }
        }
        
        document.getElementById('modal-cliente').classList.remove('hidden');
    },

    closeModals: function() {
        document.getElementById('modal-quintero').classList.add('hidden');
        document.getElementById('modal-cliente').classList.add('hidden');
        document.getElementById('modal-gasto').classList.add('hidden');
    },

    openGastoModal: function(id = null) {
        document.getElementById('form-gasto').reset();
        document.getElementById('gasto-id').value = '';
        document.getElementById('modal-gasto-title').textContent = id ? 'Editar Gasto' : 'Nuevo Gasto';
        
        if (id) {
            const gasto = this.gastosCargados.find(g => g.id == id);
            if (gasto) {
                document.getElementById('gasto-id').value = gasto.id;
                document.getElementById('gasto-descripcion').value = gasto.descripcion;
                document.getElementById('gasto-monto').value = gasto.monto_actual;
                document.getElementById('gasto-tipo-envase').value = gasto.tipo_envase || 'Torito';
                document.getElementById('gasto-activo').value = gasto.activo ? 'true' : 'false';
            }
        } else {
            document.getElementById('gasto-tipo-envase').value = this.gastoTabActiva;
        }
        
        document.getElementById('modal-gasto').classList.remove('hidden');
    },

    // --- Fetch and Display Data ---
    loadQuinteros: async function() {
        const tbody = document.getElementById('table-quinteros');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Cargando...</td></tr>';
        
        const { data, error } = await window.supabaseClient.from('quinteros').select('*').order('nombre');
        
        if (error) {
            console.error('Error cargando quinteros:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Error al cargar datos</td></tr>';
            return;
        }

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay quinteros registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(q => `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4">${q.nombre}</td>
                <td class="px-6 py-4">${q.telefono || '-'}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs rounded-full ${q.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${q.estado}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-3">
                        <button onclick="catalogs.openQuinteroModal(${q.id})" class="text-brand-600 hover:text-brand-800 transition" title="Editar">
                            <span class="material-symbols-rounded text-lg">edit</span>
                        </button>
                        <button onclick="catalogs.deleteQuintero(${q.id})" class="text-gray-400 hover:text-red-600 transition" title="Eliminar">
                            <span class="material-symbols-rounded text-lg">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    loadClientes: async function() {
        const tbody = document.getElementById('table-clientes');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Cargando...</td></tr>';
        
        const { data, error } = await window.supabaseClient.from('clientes').select('*').order('nombre');
        
        if (error) {
            console.error('Error cargando clientes:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Error al cargar datos</td></tr>';
            return;
        }

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(c => `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4">${c.nombre}</td>
                <td class="px-6 py-4">${c.mercado || '-'}</td>
                <td class="px-6 py-4">${c.telefono || '-'}</td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-3">
                        <button onclick="catalogs.openClienteModal(${c.id})" class="text-brand-600 hover:text-brand-800 transition" title="Editar">
                            <span class="material-symbols-rounded text-lg">edit</span>
                        </button>
                        <button onclick="catalogs.deleteCliente(${c.id})" class="text-gray-400 hover:text-red-600 transition" title="Eliminar">
                            <span class="material-symbols-rounded text-lg">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    switchGastoTab: function(tab) {
        this.gastoTabActiva = tab;
        
        // Actualizar tabs visualmente
        const envases = ['Torito', 'Jaulita', 'Bandeja'];
        envases.forEach(env => {
            const btn = document.getElementById(`tab-gasto-${env.toLowerCase()}`);
            if (btn) {
                if (env === tab) {
                    btn.classList.add('border-brand-500', 'text-brand-600');
                    btn.classList.remove('border-transparent', 'text-gray-500');
                } else {
                    btn.classList.remove('border-brand-500', 'text-brand-600');
                    btn.classList.add('border-transparent', 'text-gray-500');
                }
            }
        });

        // Actualizar label del pie de la tabla
        const label = document.getElementById('gasto-envase-total-label');
        if (label) label.textContent = tab;

        this.renderGastos();
    },

    renderGastos: function() {
        const tbody = document.getElementById('table-gastos');
        if (!tbody) return;

        // Filtrar gastos por tipo_envase activo
        const gastosFiltrados = this.gastosCargados.filter(g => {
            const envase = g.tipo_envase || 'Torito';
            return envase.toLowerCase() === this.gastoTabActiva.toLowerCase();
        });

        if (gastosFiltrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay gastos registrados para ${this.gastoTabActiva}.</td></tr>`;
            document.getElementById('total-gastos-fijos').textContent = '$ 0.00';
            return;
        }

        let total = 0;
        tbody.innerHTML = gastosFiltrados.map(g => {
            if (g.activo) total += parseFloat(g.monto_actual);
            return `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-4">${g.descripcion}</td>
                    <td class="px-6 py-4 text-right">$ ${g.monto_actual}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 text-xs rounded-full ${g.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                            ${g.activo ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-3">
                            <button onclick="catalogs.openGastoModal(${g.id})" class="text-brand-600 hover:text-brand-800 transition" title="Editar">
                                <span class="material-symbols-rounded text-lg">edit</span>
                            </button>
                            <button onclick="catalogs.deleteGasto(${g.id})" class="text-gray-400 hover:text-red-600 transition" title="Eliminar">
                                <span class="material-symbols-rounded text-lg">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('total-gastos-fijos').textContent = '$ ' + total.toFixed(2);
    },

    loadGastos: async function() {
        const tbody = document.getElementById('table-gastos');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Cargando...</td></tr>';
        
        const { data, error } = await window.supabaseClient.from('conceptos_gastos').select('*').order('descripcion');
        
        if (error) {
            console.error('Error cargando gastos:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Error al cargar datos</td></tr>';
            return;
        }

        this.gastosCargados = data || [];
        this.renderGastos();
    },

    // --- Save and Delete Data ---
    deleteQuintero: async function(id) {
        UI.confirm("¿Desea eliminar este quintero? Solo será posible si no tiene movimientos asociados.", async () => {
            const { error } = await window.supabaseClient.from('quinteros').delete().eq('id', id);
            if (error) {
                UI.error("No se pudo eliminar: tiene datos vinculados (lotes o movimientos).");
            } else {
                UI.success("Quintero eliminado.");
                this.loadQuinteros();
            }
        });
    },

    deleteCliente: async function(id) {
        UI.confirm("¿Desea eliminar este cliente? Solo será posible si no tiene movimientos asociados.", async () => {
            const { error } = await window.supabaseClient.from('clientes').delete().eq('id', id);
            if (error) {
                UI.error("No se pudo eliminar: tiene datos vinculados (ventas o movimientos).");
            } else {
                UI.success("Cliente eliminado.");
                this.loadClientes();
            }
        });
    },

    deleteGasto: async function(id) {
        UI.confirm("¿Desea eliminar este concepto de gasto?", async () => {
            const { error } = await window.supabaseClient.from('conceptos_gastos').delete().eq('id', id);
            if (error) {
                UI.error("No se pudo eliminar.");
            } else {
                UI.success("Gasto eliminado.");
                this.loadGastos();
            }
        });
    },

    saveQuintero: async function(e) {
        e.preventDefault();
        const id = document.getElementById('quintero-id').value;
        const nombre = document.getElementById('quintero-nombre').value;
        const telefono = document.getElementById('quintero-telefono').value;
        const estado = document.getElementById('quintero-estado').value;

        const payload = { nombre, telefono, estado };

        let result;
        if (id) {
            result = await window.supabaseClient.from('quinteros').update(payload).eq('id', id);
        } else {
            result = await window.supabaseClient.from('quinteros').insert([payload]);
        }

        if (result.error) {
            UI.error('Error al guardar quintero: ' + result.error.message);
        } else {
            this.closeModals();
            this.loadQuinteros();
        }
    },

    saveCliente: async function(e) {
        e.preventDefault();
        const id = document.getElementById('cliente-id').value;
        const nombre = document.getElementById('cliente-nombre').value;
        const mercado = document.getElementById('cliente-mercado').value;
        const telefono = document.getElementById('cliente-telefono').value;

        const payload = { nombre, mercado, telefono };

        let result;
        if (id) {
            result = await window.supabaseClient.from('clientes').update(payload).eq('id', id);
        } else {
            result = await window.supabaseClient.from('clientes').insert([payload]);
        }

        if (result.error) {
            UI.error('Error al guardar cliente: ' + result.error.message);
        } else {
            this.closeModals();
            this.loadClientes();
        }
    },

    saveGasto: async function(e) {
        e.preventDefault();
        const id = document.getElementById('gasto-id').value;
        const descripcion = document.getElementById('gasto-descripcion').value;
        const monto_actual = parseFloat(document.getElementById('gasto-monto').value);
        const tipo_envase = document.getElementById('gasto-tipo-envase').value;
        const activo = document.getElementById('gasto-activo').value === 'true';

        const payload = { descripcion, monto_actual, tipo_envase, activo };

        let result;
        if (id) {
            result = await window.supabaseClient.from('conceptos_gastos').update(payload).eq('id', id);
        } else {
            result = await window.supabaseClient.from('conceptos_gastos').insert([payload]);
        }

        if (result.error) {
            UI.error('Error al guardar gasto: ' + result.error.message);
        } else {
            this.closeModals();
            this.loadGastos();
        }
    },
    init: function() {
        console.log("Inicializando Catálogos...");
        // Cargar todo (quinteros, clientes y gastos)
        this.loadQuinteros();
        this.loadClientes();
        this.loadGastos();
    }
};

// Eliminados los listeners redundantes. app.js maneja la carga ahora.
