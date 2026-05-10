const ventas = {
    lotesDisponibles: [],
    envasesDisponibles: [],
    clientesDisponibles: [],

    init: async function () {
        console.log("Iniciando Ventas...");
        // Mantener la fecha si ya está puesta, o poner hoy
        if (!document.getElementById('venta-fecha').value) {
            document.getElementById('venta-fecha').value = new Date().toLocaleDateString('en-CA');
        }

        await this.cargarCatalogos();

        // Listener para recalcular totales si cambia gastos flete manually
        // Usamos un flag para no agregar múltiples listeners
        if (!this.initialized) {
            document.getElementById('venta-gastos').addEventListener('input', () => {
                const btnProrrateo = document.querySelector('button[onclick="ventas.aplicarProrrateo()"]');
                if (btnProrrateo) {
                    btnProrrateo.classList.remove('bg-green-600', 'hover:bg-green-700');
                    btnProrrateo.classList.add('bg-gray-800', 'hover:bg-gray-900');
                    btnProrrateo.innerHTML = 'Aplicar Prorrateo';
                }
                this.actualizarResumen(false);
            });

            document.getElementById('table-venta-detalles').addEventListener('input', () => this.intentarAutoProrrateo());
            document.getElementById('table-venta-detalles').addEventListener('change', () => this.intentarAutoProrrateo());
            document.getElementById('venta-gastos').addEventListener('input', () => this.intentarAutoProrrateo());

            this.initialized = true;
        }

        this.renderizarGrillaBase();
        this.switchTab('nueva');
    },

    renderizarGrillaBase: function () {
        const tbody = document.getElementById('table-venta-detalles');
        tbody.innerHTML = '';

        if (window.appData && window.appData.plantilla_productos) {
            window.appData.plantilla_productos.forEach(item => {
                this.agregarFila(item);
            });
        }

        // Agregar siempre una fila vacía extra al final por defecto
        this.agregarFilaExtra();
    },

    cargarCatalogos: async function () {
        try {
            const { data: lotesReq } = await window.supabaseClient.from('lotes_ingreso')
                .select('id, fecha, producto, toritos_obtenidos, quinteros(nombre)')
                .eq('estado', 'abierto')
                .order('id', { ascending: false });

            const { data: envasesReq } = await window.supabaseClient.from('envases').select('*').order('nombre');
            const { data: clientesReq } = await window.supabaseClient.from('clientes').select('id, nombre').order('nombre');

            let lotesData = lotesReq || [];

            // Calcular stock disponible real (toritos obtenidos - ventas)
            if (lotesData.length > 0) {
                const loteIds = lotesData.map(l => l.id);
                const { data: ventasData, error: ventasError } = await window.supabaseClient.from('ventas_detalles')
                    .select('lote_id, cantidad, envases(equivalencia_bulto)')
                    .in('lote_id', loteIds);

                if (ventasError) {
                    console.error("Error al calcular ventas previas:", ventasError);
                }

                const ventasPorLote = {};
                if (ventasData) {
                    ventasData.forEach(v => {
                        const equiv = v.envases ? parseFloat(v.envases.equivalencia_bulto) : 1;
                        ventasPorLote[v.lote_id] = (ventasPorLote[v.lote_id] || 0) + (v.cantidad * equiv);
                    });
                }

                const plantilla = window.appData?.plantilla_productos || [];
                lotesData.forEach(l => {
                    const vendidasToritos = ventasPorLote[l.id] || 0;
                    const equivNativo = getEquivNativoLote(l.producto, envasesReq, plantilla);
                    const obtenidosToritos = l.toritos_obtenidos * equivNativo;
                    const disponiblesToritos = Math.max(0, obtenidosToritos - vendidasToritos);
                    l.toritos_disponibles = Math.max(0, Math.round((disponiblesToritos / equivNativo) * 100) / 100);
                });
            }

            this.lotesDisponibles = lotesData;
            this.envasesDisponibles = envasesReq || [];
            this.clientesDisponibles = clientesReq || [];

            const selectCliente = document.getElementById('venta-cliente');
            selectCliente.innerHTML = '<option value="">Seleccione...</option>';
            this.clientesDisponibles.forEach(c => {
                selectCliente.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
            });
        } catch (err) {
            console.error("Error al cargar catálogos para ventas:", err);
            UI.error("No se pudieron cargar los datos necesarios para la venta.");
        }
    },

    agregarFila: function (plantillaItem) {
        const tbody = document.getElementById('table-venta-detalles');
        const tr = document.createElement('tr');
        tr.className = "fila-detalle group";

        // Buscar envase_id según el nombre
        let envaseMatch = this.envasesDisponibles.find(e => e.nombre.toLowerCase() === plantillaItem.envase_nombre.toLowerCase());
        let envaseId = envaseMatch ? envaseMatch.id : '';
        let envaseEquiv = envaseMatch ? envaseMatch.equivalencia_bulto : 1;

        // Filtrar solo los lotes que coincidan con este producto
        const lotesFiltrados = this.lotesDisponibles.filter(l =>
            l.producto && l.producto.toLowerCase().includes(plantillaItem.producto.toLowerCase())
        );

        const lotesOptions = lotesFiltrados.map(l =>
            `<option value="${l.id}">[ ${l.toritos_disponibles} ] Lote #${l.id} - ${l.producto} - ${l.quinteros?.nombre || 'S/D'}</option>`
        ).join('');

        const noLotes = lotesFiltrados.length === 0 ? '<option value="">Sin Stock</option>' : '<option value="">Seleccionar Lote...</option>';

        tr.innerHTML = `
            <td class="px-2 py-2 cell-lote">
                <select class="input-lote w-full px-2 py-2 border border-gray-300 rounded-md bg-white shadow-sm font-medium text-gray-700 focus:ring-2 focus:ring-brand-500 outline-none text-xs hover:border-brand-400 cursor-pointer transition" ${lotesFiltrados.length === 0 ? 'disabled' : ''}>
                    ${noLotes}
                    ${lotesOptions}
                </select>
            </td>
            <td class="px-2 py-2 font-medium">
                <div class="px-2 py-1 rounded text-center text-xs font-bold ${plantillaItem.bg_color} ${plantillaItem.text_color}">
                    ${plantillaItem.producto}
                </div>
                <input type="hidden" class="input-producto" value="${plantillaItem.producto}">
            </td>
            <td class="px-2 py-2 text-xs text-center text-gray-600">
                ${plantillaItem.calibre || '-'}
                <input type="hidden" class="input-calibre" value="${plantillaItem.calibre || ''}">
            </td>
            <td class="px-2 py-2 text-xs text-center text-gray-500">
                ${plantillaItem.envase_nombre}
                <input type="hidden" class="input-envase" value="${envaseId}" data-equiv="${envaseEquiv}">
            </td>
            <td class="px-2 py-2">
                <input type="number" class="input-cantidad w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-center" min="1" placeholder="0" oninput="ventas.resetProrrateo()">
            </td>
            <td class="px-2 py-2">
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-xs">$</span>
                    <input type="number" class="input-precio-bruto w-full pl-5 pr-1 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none" min="0" placeholder="0.00" oninput="ventas.resetProrrateo()">
                </div>
            </td>
            <td class="px-2 py-2 bg-green-50 text-green-800 font-bold calc-neto text-center">
                -
            </td>
            <td class="px-2 py-2 text-right">
                <input type="hidden" class="hidden-descuento">
                <input type="hidden" class="hidden-neto">
            </td>
        `;
        tbody.appendChild(tr);
    },

    agregarFilaExtra: function () {
        const tbody = document.getElementById('table-venta-detalles');
        const tr = document.createElement('tr');
        tr.className = "fila-detalle group";

        const lotesOptions = this.lotesDisponibles.map(l =>
            `<option value="${l.id}">[ ${l.toritos_disponibles} ] Lote #${l.id} - ${l.producto} - ${l.quinteros?.nombre || 'S/D'}</option>`
        ).join('');

        const envasesOptions = this.envasesDisponibles.map(e =>
            `<option value="${e.id}" data-equiv="${e.equivalencia_bulto}">${e.nombre}</option>`
        ).join('');

        tr.innerHTML = `
            <td class="px-2 py-2 cell-lote">
                <select class="input-lote w-full px-2 py-2 border border-gray-300 rounded-md bg-white shadow-sm font-medium text-gray-700 focus:ring-2 focus:ring-brand-500 outline-none text-xs hover:border-brand-400 cursor-pointer transition" onchange="ventas.actualizarProductoPorLote(this)">
                    <option value="">Seleccionar Lote...</option>
                    ${lotesOptions}
                </select>
            </td>
            <td class="px-2 py-2">
                <input type="text" placeholder="Otro..." class="input-producto w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-brand-500 outline-none text-xs">
            </td>
            <td class="px-2 py-2">
                <input type="text" placeholder="Calibre" class="input-calibre w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-brand-500 outline-none text-xs">
            </td>
            <td class="px-2 py-2">
                <select class="input-envase w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-brand-500 outline-none text-xs" onchange="ventas.resetProrrateo()">
                    <option value="">Envase</option>
                    ${envasesOptions}
                </select>
            </td>
            <td class="px-2 py-2">
                <input type="number" class="input-cantidad w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-center" min="1" placeholder="0" oninput="ventas.resetProrrateo()">
            </td>
            <td class="px-2 py-2">
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-xs">$</span>
                    <input type="number" class="input-precio-bruto w-full pl-5 pr-1 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none" min="0" placeholder="0.00" oninput="ventas.resetProrrateo()">
                </div>
            </td>
            <td class="px-2 py-2 bg-green-50 text-green-800 font-bold calc-neto text-center">
                -
            </td>
            <td class="px-2 py-2 text-right">
                <button type="button" onclick="this.closest('tr').remove(); ventas.intentarAutoProrrateo();" class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition font-bold text-lg">
                    &times;
                </button>
                <input type="hidden" class="hidden-descuento">
                <input type="hidden" class="hidden-neto">
            </td>
        `;
        tbody.appendChild(tr);
    },

    resetProrrateo: function () {
        document.querySelectorAll('.calc-neto').forEach(td => td.textContent = '-');
        document.querySelectorAll('.hidden-descuento').forEach(i => i.value = '');
        document.querySelectorAll('.hidden-neto').forEach(i => i.value = '');

        this.actualizarResumen(false);
    },

    leerFilas: function (silent = false) {
        const filas = document.querySelectorAll('.fila-detalle');
        let detalles = [];
        let valid = true;
        let stockUsado = {};

        filas.forEach((tr, idx) => {
            tr.classList.remove('row-invalid');
            const cantidadInput = tr.querySelector('.input-cantidad');
            const qty = parseInt(cantidadInput.value);

            // SOLO procesar si hay cantidad > 0
            if (qty > 0) {
                const loteSelect = tr.querySelector('.input-lote');
                const productoInput = tr.querySelector('.input-producto');
                const calibreInput = tr.querySelector('.input-calibre');

                // Envase puede ser select (fila extra) o hidden (fila plantilla)
                let envaseId, equiv_bulto;
                const envaseSelect = tr.querySelector('select.input-envase');
                if (envaseSelect) {
                    envaseId = envaseSelect.value;
                    const envaseOption = envaseSelect.options[envaseSelect.selectedIndex];
                    equiv_bulto = envaseOption ? parseFloat(envaseOption.dataset.equiv) : 1;
                } else {
                    const envaseHidden = tr.querySelector('input.input-envase');
                    envaseId = envaseHidden.value;
                    equiv_bulto = parseFloat(envaseHidden.dataset.equiv);
                }

                const precioInput = tr.querySelector('.input-precio-bruto');

                if (!loteSelect.value || !productoInput.value || !envaseId || !precioInput.value) {
                    valid = false;
                    tr.classList.add('row-invalid'); // highlight error
                    return;
                }

                const loteId = parseInt(loteSelect.value);
                const loteObj = this.lotesDisponibles.find(l => l.id === loteId);
                const stockDisponible = loteObj ? loteObj.toritos_disponibles : 0;
                
                const equivNativo = getEquivNativoLote(loteObj ? loteObj.producto : '', this.envasesDisponibles, window.appData?.plantilla_productos);
                const consumidoToritos = qty * equiv_bulto;
                const consumido = consumidoToritos / equivNativo;

                stockUsado[loteId] = (stockUsado[loteId] || 0) + consumido;

                if (Math.round(stockUsado[loteId] * 100) / 100 > stockDisponible) {
                    valid = false;
                    tr.classList.add('row-invalid');
                    if (!silent) {
                        UI.alert(`Stock insuficiente en el Lote #${loteId}. Tienes ${stockDisponible} bultos disponibles, e intentas vender ${Math.round(stockUsado[loteId] * 100) / 100}.`, "Stock Insuficiente");
                    }
                    return;
                } else {
                    tr.classList.remove('row-invalid');
                }

                detalles.push({
                    index: idx,
                    lote_id: loteId,
                    producto: productoInput.value.trim(),
                    calibre: calibreInput.value.trim(),
                    envase_id: parseInt(envaseId),
                    cantidad: qty,
                    precio_bruto: parseFloat(precioInput.value),
                    equiv_bulto: equiv_bulto,
                    tr_element: tr
                });
            }
        });

        return { detalles, valid: valid && detalles.length > 0 };
    },

    intentarAutoProrrateo: function () {
        // Limpiar visualmente antes de recalcular
        document.querySelectorAll('.calc-neto').forEach(td => td.textContent = '-');

        const gastosFlete = parseFloat(document.getElementById('venta-gastos').value) || 0;
        const { detalles, valid } = this.leerFilas(true); // silent validation

        if (!valid || detalles.length === 0) {
            this.resetProrrateo();
            return;
        }

        // Usar la función utilitaria calcularProrrateoVenta (de utils.js)
        const resultados = calcularProrrateoVenta(detalles, gastosFlete);

        // Volcar resultados a la UI
        resultados.forEach(res => {
            const tr = res.tr_element;
            const tdNeto = tr.querySelector('.calc-neto');
            tdNeto.textContent = formatCurrency(res.precio_neto);

            tr.querySelector('.hidden-descuento').value = res.descuento_aplicado;
            tr.querySelector('.hidden-neto').value = res.precio_neto;
        });

        this.actualizarResumen(true, resultados);
    },

    actualizarResumen: function (prorrateado, resultados = []) {
        const { detalles } = this.leerFilas(true);
        let totalBruto = 0;

        detalles.forEach(d => {
            totalBruto += (d.cantidad * d.precio_bruto);
        });

        document.getElementById('resumen-bruto').textContent = formatCurrency(totalBruto);

        if (!prorrateado) {
            document.getElementById('resumen-gastos').textContent = formatCurrency(0);
            document.getElementById('resumen-neto').textContent = formatCurrency(totalBruto);
        } else {
            let totalDescuentos = 0;
            let totalNeto = 0;
            resultados.forEach(r => {
                totalDescuentos += (r.descuento_aplicado * r.cantidad);
                totalNeto += r.total_neto_linea;
            });

            document.getElementById('resumen-gastos').textContent = "-" + formatCurrency(totalDescuentos);
            document.getElementById('resumen-neto').textContent = formatCurrency(totalNeto);
        }
    },

    guardarVenta: async function () {
        const cliente_id = document.getElementById('venta-cliente').value;
        const fecha = document.getElementById('venta-fecha').value;
        const gastos_transporte = parseFloat(document.getElementById('venta-gastos').value) || 0;

        if (!cliente_id) {
            UI.alert("Debe seleccionar un cliente.", "Faltan datos"); return;
        }

        const { detalles, valid } = this.leerFilas(false);
        if (!valid) return;

        const btnGuardar = document.getElementById('btn-guardar-venta');
        btnGuardar.disabled = true;
        btnGuardar.textContent = "Guardando...";

        try {
            // 1. Calcular totales
            let total_bruto = 0;
            let total_neto = 0;

            const payloadDetalles = detalles.map(d => {
                const tr = d.tr_element;
                const neto = parseFloat(tr.querySelector('.hidden-neto').value);
                total_bruto += (d.cantidad * d.precio_bruto);
                total_neto += (d.cantidad * neto);

                return {
                    lote_id: d.lote_id,
                    producto: d.producto,
                    calibre: d.calibre,
                    envase_id: d.envase_id,
                    cantidad: d.cantidad,
                    precio_unitario_bruto: d.precio_bruto,
                    precio_unitario_neto: neto,
                    descuento_aplicado: parseFloat(tr.querySelector('.hidden-descuento').value)
                };
            });

            // 2. Insertar comprobante
            const { data: compData, error: compError } = await window.supabaseClient.from('ventas_comprobantes').insert([{
                fecha: fecha,
                cliente_id: parseInt(cliente_id),
                gastos_transporte_bajada: gastos_transporte,
                total_bruto: total_bruto,
                total_neto: total_neto
            }]).select();

            if (compError) throw compError;
            const comprobante_id = compData[0].id;

            // 3. Insertar detalles
            payloadDetalles.forEach(pd => pd.comprobante_id = comprobante_id);
            const { error: detError } = await window.supabaseClient.from('ventas_detalles').insert(payloadDetalles);
            if (detError) throw detError;

            // 4. Insertar movimiento en cuenta corriente
            const { error: movError } = await window.supabaseClient.from('movimientos_cuenta').insert([{
                tipo_entidad: 'cliente',
                entidad_id: parseInt(cliente_id),
                comprobante_relacionado_id: comprobante_id,
                detalle: `Venta Nº ${comprobante_id}`,
                tipo_movimiento: 'venta',
                monto: total_neto
            }]);

            if (movError) throw movError;

            UI.success("Venta registrada exitosamente.");

            document.getElementById('form-venta-header').reset();
            document.getElementById('venta-fecha').value = new Date().toLocaleDateString('en-CA');
            this.resetProrrateo();

            await this.cargarCatalogos();
            this.renderizarGrillaBase();

        } catch (err) {
            console.error("Error al guardar venta:", err);
            UI.error("Error al guardar la venta: " + err.message);
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = "Confirmar Venta";
        }
    },

    switchTab: function (tab) {
        document.getElementById('tab-venta-nueva').classList.remove('border-brand-500', 'text-brand-600');
        document.getElementById('tab-venta-nueva').classList.add('border-transparent', 'text-gray-500');
        document.getElementById('tab-venta-historial').classList.remove('border-brand-500', 'text-brand-600');
        document.getElementById('tab-venta-historial').classList.add('border-transparent', 'text-gray-500');

        document.getElementById('venta-sec-nueva').classList.add('hidden');
        document.getElementById('venta-sec-historial').classList.add('hidden');

        document.getElementById(`tab-venta-${tab}`).classList.remove('border-transparent', 'text-gray-500');
        document.getElementById(`tab-venta-${tab}`).classList.add('border-brand-500', 'text-brand-600');
        document.getElementById(`venta-sec-${tab}`).classList.remove('hidden');

        if (tab === 'historial') {
            this.loadHistorial();
        }
    },

    actualizarProductoPorLote: function (select) {
        const tr = select.closest('tr');
        const loteId = select.value;
        if (!loteId) return;

        const lote = this.lotesDisponibles.find(l => l.id == loteId);
        if (lote) {
            const prodInput = tr.querySelector('.input-producto');
            if (prodInput) {
                prodInput.value = lote.producto;
            }
        }
        this.resetProrrateo();
    },

    loadHistorial: async function () {
        const tbody = document.getElementById('table-historial-ventas');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">Cargando ventas...</td></tr>';

        try {
            const { data, error } = await window.supabaseClient
                .from('ventas_comprobantes')
                .select(`
                    id, 
                    fecha, 
                    total_neto,
                    clientes (nombre),
                    ventas_detalles (producto, cantidad, calibre, precio_unitario_neto, envases(nombre))
                `)
                .order('id', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay ventas registradas.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(v => {
                const partesFecha = v.fecha.split('-');
                const fechaLocal = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

                const detalleHTML = v.ventas_detalles.map(d =>
                    `<div class="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-brand-600">${d.cantidad}</span>
                            <span class="text-gray-400">x</span>
                            <span>${d.envases?.nombre || 'Bultos'} ${d.producto} <small class="text-gray-400">(${d.calibre || '-'})</small></span>
                        </div>
                        <div class="font-medium text-gray-500">${formatCurrency(d.precio_unitario_neto)}</div>
                    </div>`
                ).join('');

                return `
                <tr class="hover:bg-gray-50 transition group">
                    <td class="px-6 py-4 font-medium text-gray-900 align-top">#${v.id}</td>
                    <td class="px-6 py-4 align-top whitespace-nowrap text-gray-500">${fechaLocal}</td>
                    <td class="px-6 py-4 align-top">
                        <div class="font-bold text-gray-800 mb-3 text-base">${v.clientes?.nombre || '-'}</div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            ${detalleHTML}
                        </div>
                    </td>
                    <td class="px-6 py-4 text-right font-bold text-green-600 align-top text-base">${formatCurrency(v.total_neto)}</td>
                    <td class="px-6 py-4 text-right align-top">
                        <button onclick="ventas.deleteVenta(${v.id})" class="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar Venta Completa">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                    </td>
                </tr>
            `}).join('');

        } catch (err) {
            console.error("Error cargando historial de ventas:", err);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-red-500">Error al cargar historial.</td></tr>';
        }
    },

    deleteVenta: async function (id) {
        UI.confirm("¿Está seguro que desea eliminar esta venta por completo? Se borrarán todos sus detalles y se actualizará la cuenta corriente del cliente.", async () => {
            try {
                await window.supabaseClient.from('movimientos_cuenta').delete().eq('comprobante_relacionado_id', id).eq('tipo_movimiento', 'venta');
                await window.supabaseClient.from('ventas_detalles').delete().eq('comprobante_id', id);
                const { error } = await window.supabaseClient.from('ventas_comprobantes').delete().eq('id', id);

                if (error) throw error;

                UI.success("Venta eliminada correctamente.");
                this.loadHistorial();
                this.cargarCatalogos();
            } catch (err) {
                UI.error("Error al eliminar venta: " + err.message);
            }
        });
    },

    resetProrrateo: function () {
        const btnProrrateo = document.querySelector('button[onclick="ventas.aplicarProrrateo()"]');
        if (btnProrrateo) {
            btnProrrateo.classList.remove('bg-green-600', 'hover:bg-green-700');
            btnProrrateo.classList.add('bg-gray-800', 'hover:bg-gray-900');
            btnProrrateo.innerHTML = 'Aplicar Prorrateo';
        }
        this.actualizarResumen(false);
    }
};

// Eliminado el listener antiguo de DOMContentLoaded para ventas,
// ya que app.js ahora maneja la inicialización mediante triggerModuleInit.
