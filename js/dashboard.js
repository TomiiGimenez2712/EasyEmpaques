const dashboard = {
    init: async function() {
        this.cargarSaldos();
    },

    cargarSaldos: async function() {
        try {
            const [movsReq, quinReq, cliReq, lotesReq] = await Promise.all([
                window.supabaseClient.from('movimientos_cuenta').select('tipo_entidad, entidad_id, tipo_movimiento, monto'),
                window.supabaseClient.from('quinteros').select('id, nombre').eq('estado', 'activo'),
                window.supabaseClient.from('clientes').select('id, nombre'),
                window.supabaseClient.from('lotes_ingreso').select('id, producto, toritos_obtenidos').eq('estado', 'abierto')
            ]);

            const movimientos = movsReq.data || [];
            const quinteros = quinReq.data || [];
            const clientes = cliReq.data || [];
            const lotes = lotesReq.data || [];

            this.renderizarQuinteros(movimientos, quinteros);
            this.renderizarClientes(movimientos, clientes);
            this.calcularYRenderizarStock(lotes);
        } catch (e) {
            console.error("Error al cargar datos del dashboard:", e);
        }
    },

    calcularYRenderizarStock: async function(lotes) {
        const tbody = document.getElementById('table-stock-general');
        
        if (lotes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay lotes abiertos con stock.</td></tr>';
            return;
        }

        const loteIds = lotes.map(l => l.id);
        
        try {
            // Buscar ventas de estos lotes
            const { data: ventasData } = await window.supabaseClient.from('ventas_detalles')
                .select('lote_id, cantidad, envases(equivalencia_bulto)')
                .in('lote_id', loteIds);

            // Calcular ventas por lote
            const ventasPorLote = {};
            if (ventasData) {
                ventasData.forEach(v => {
                    const equiv = v.envases ? parseFloat(v.envases.equivalencia_bulto) : 1;
                    ventasPorLote[v.lote_id] = (ventasPorLote[v.lote_id] || 0) + (v.cantidad * equiv);
                });
            }

            // Obtener envases y plantilla para equivalencias nativas
            const { data: envasesReq } = await window.supabaseClient.from('envases').select('*');
            const envases = envasesReq || [];
            const plantilla = window.appData?.plantilla_productos || [];

            // Agrupar stock disponible por producto
            const stockAgrupado = {};
            lotes.forEach(l => {
                const vendidasToritos = ventasPorLote[l.id] || 0;
                const equivNativo = getEquivNativoLote(l.producto, envases, plantilla);
                
                const obtenidosToritos = l.toritos_obtenidos * equivNativo;
                const disponiblesToritos = Math.max(0, obtenidosToritos - vendidasToritos);
                
                // Volver a unidad nativa (ej. Bandejas)
                const disponiblesNativos = Math.round((disponiblesToritos / equivNativo) * 100) / 100;
                
                if (disponiblesNativos > 0) {
                    const prodName = l.producto || 'Desconocido';
                    stockAgrupado[prodName] = (stockAgrupado[prodName] || 0) + disponiblesNativos;
                }
            });

            // Renderizar
            tbody.innerHTML = '';
            const productos = Object.keys(stockAgrupado).sort();
            
            if (productos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">Stock agotado en lotes abiertos.</td></tr>';
                return;
            }

            productos.forEach(prod => {
                const cantidad = stockAgrupado[prod].toFixed(1).replace('.0', '');
                const nombreEnvase = getNombreEnvaseNativo(prod, plantilla);
                tbody.innerHTML += `
                    <tr class="hover:bg-blue-50 transition-colors">
                        <td class="py-3 px-2 font-medium text-gray-800">${prod}</td>
                        <td class="py-3 px-2 text-center text-gray-500">${nombreEnvase}s</td>
                        <td class="py-3 px-2 text-right text-blue-700 font-bold text-lg">${cantidad}</td>
                    </tr>
                `;
            });
            
        } catch (err) {
            console.error("Error al calcular stock:", err);
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-red-500">Error al cargar stock.</td></tr>';
        }
    },

    renderizarQuinteros: function(movimientos, quinteros) {
        const tbody = document.getElementById('table-saldos-quinteros');
        tbody.innerHTML = '';

        // Calcular saldo por quintero
        // Liquidacion = a favor del quintero (+)
        // Pago = en contra del quintero (-)
        let saldos = {};
        quinteros.forEach(q => saldos[q.id] = { id: q.id, nombre: q.nombre, saldo: 0 });

        movimientos.forEach(m => {
            if (m.tipo_entidad === 'quintero' && saldos[m.entidad_id]) {
                if (m.tipo_movimiento === 'liquidacion') saldos[m.entidad_id].saldo += parseFloat(m.monto);
                if (m.tipo_movimiento === 'pago') saldos[m.entidad_id].saldo -= parseFloat(m.monto);
            }
        });

        // Ordenar por saldo mayor a menor
        const saldosArr = Object.values(saldos).sort((a, b) => b.saldo - a.saldo);

        if (saldosArr.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay quinteros activos.</td></tr>';
            return;
        }

        saldosArr.forEach(q => {
            // Solo mostrar si tienen deuda u operaron
            const textColor = q.saldo > 0 ? 'text-red-600 font-bold' : (q.saldo < 0 ? 'text-green-600 font-bold' : 'text-gray-500');
            const montoStr = formatCurrency(q.saldo);

            tbody.innerHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="py-3 px-2">${q.nombre}</td>
                    <td class="py-3 px-2 text-right ${textColor}">${montoStr}</td>
                    <td class="py-3 px-2 text-center">
                        <button onclick="dashboard.openModal('quintero', ${q.id}, '${q.nombre}', 'pago', ${q.saldo})" class="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition text-xs font-medium">
                            Pagar
                        </button>
                    </td>
                </tr>
            `;
        });
    },

    renderizarClientes: function(movimientos, clientes) {
        const tbody = document.getElementById('table-saldos-clientes');
        tbody.innerHTML = '';

        // Calcular saldo por cliente
        // Venta = a favor nuestro, deuda del cliente (+)
        // Cobro = pago del cliente, reduce su deuda (-)
        let saldos = {};
        clientes.forEach(c => saldos[c.id] = { id: c.id, nombre: c.nombre, saldo: 0 });

        movimientos.forEach(m => {
            if (m.tipo_entidad === 'cliente' && saldos[m.entidad_id]) {
                if (m.tipo_movimiento === 'venta') saldos[m.entidad_id].saldo += parseFloat(m.monto);
                if (m.tipo_movimiento === 'cobro') saldos[m.entidad_id].saldo -= parseFloat(m.monto);
            }
        });

        // Ordenar por saldo mayor a menor
        const saldosArr = Object.values(saldos).sort((a, b) => b.saldo - a.saldo);

        if (saldosArr.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>';
            return;
        }

        saldosArr.forEach(c => {
            const textColor = c.saldo > 0 ? 'text-green-600 font-bold' : (c.saldo < 0 ? 'text-red-600 font-bold' : 'text-gray-500');
            const montoStr = formatCurrency(c.saldo);

            tbody.innerHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="py-3 px-2">${c.nombre}</td>
                    <td class="py-3 px-2 text-right ${textColor}">${montoStr}</td>
                    <td class="py-3 px-2 text-center">
                        <button onclick="dashboard.openModal('cliente', ${c.id}, '${c.nombre}', 'cobro', ${c.saldo})" class="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition text-xs font-medium">
                            Cobrar
                        </button>
                    </td>
                </tr>
            `;
        });
    },

    openModal: function(tipo_entidad, entidad_id, nombre, tipo_movimiento, saldo) {
        this.saldoActualModal = Math.abs(saldo); // Guardamos el valor absoluto para pagar/cobrar
        
        document.getElementById('mov-tipo-entidad').value = tipo_entidad;
        document.getElementById('mov-entidad-id').value = entidad_id;
        document.getElementById('mov-tipo-movimiento').value = tipo_movimiento;
        document.getElementById('mov-fecha').value = new Date().toLocaleDateString('en-CA');
        document.getElementById('mov-monto').value = '';
        document.getElementById('mov-detalle').value = '';
        document.getElementById('mov-monto-preview').textContent = '';

        const titulo = tipo_movimiento === 'pago' ? `Registrar PAGO a ${nombre}` : `Registrar COBRO de ${nombre}`;
        document.getElementById('modal-movimiento-title').textContent = titulo;
        
        // Actualizar UI del saldo
        document.getElementById('mov-saldo-actual').textContent = formatCurrency(this.saldoActualModal);
        
        const btn = document.getElementById('btn-guardar-movimiento');
        btn.textContent = tipo_movimiento === 'pago' ? 'Guardar Pago' : 'Guardar Cobro';
        btn.className = tipo_movimiento === 'pago' ? 
            'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium shadow-sm' : 
            'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-sm';

        document.getElementById('modal-movimiento').classList.remove('hidden');
        document.getElementById('modal-movimiento').classList.add('flex');
    },

    llenarTotal: function() {
        document.getElementById('mov-monto').value = this.saldoActualModal;
        this.updateMontoPreview();
    },

    updateMontoPreview: function() {
        const monto = parseFloat(document.getElementById('mov-monto').value) || 0;
        const preview = document.getElementById('mov-monto-preview');
        if (monto > 0) {
            preview.textContent = "Equivale a: " + formatCurrency(monto);
        } else {
            preview.textContent = "";
        }
    },

    closeModal: function() {
        document.getElementById('modal-movimiento').classList.add('hidden');
        document.getElementById('modal-movimiento').classList.remove('flex');
    },

    guardarMovimiento: async function() {
        const btn = document.getElementById('btn-guardar-movimiento');
        btn.disabled = true;
        btn.textContent = "Guardando...";

        const payload = {
            fecha: document.getElementById('mov-fecha').value,
            tipo_entidad: document.getElementById('mov-tipo-entidad').value,
            entidad_id: parseInt(document.getElementById('mov-entidad-id').value),
            tipo_movimiento: document.getElementById('mov-tipo-movimiento').value,
            monto: parseFloat(document.getElementById('mov-monto').value),
            detalle: document.getElementById('mov-detalle').value.trim()
        };

        try {
            const { error } = await window.supabaseClient.from('movimientos_cuenta').insert([payload]);
            if (error) throw error;

            this.closeModal();
            this.cargarSaldos(); // Recargar tablas automáticamente
        } catch (e) {
            console.error("Error al guardar movimiento:", e);
            UI.error("Ocurrió un error al guardar el movimiento.");
        } finally {
            btn.disabled = false;
        }
    }
};

// Eliminados los listeners redundantes. app.js maneja la carga ahora.
