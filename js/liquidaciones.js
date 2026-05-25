const liquidaciones = {
    lotesAbiertos: [],
    historialRemesas: [],
    loteActual: null,

    init: async function() {
        await this.cargarLotesAbiertos();
        // Reset to default tab
        this.switchTab('pendientes');
    },

    switchTab: function(tab) {
        document.getElementById('tab-btn-pendientes').classList.remove('border-brand-500', 'text-brand-600');
        document.getElementById('tab-btn-pendientes').classList.add('border-transparent', 'text-gray-500');
        document.getElementById('tab-btn-historial').classList.remove('border-brand-500', 'text-brand-600');
        document.getElementById('tab-btn-historial').classList.add('border-transparent', 'text-gray-500');

        document.getElementById('liq-tab-pendientes').classList.add('hidden');
        document.getElementById('liq-tab-historial').classList.add('hidden');

        document.getElementById(`tab-btn-${tab}`).classList.remove('border-transparent', 'text-gray-500');
        document.getElementById(`tab-btn-${tab}`).classList.add('border-brand-500', 'text-brand-600');
        document.getElementById(`liq-tab-${tab}`).classList.remove('hidden');

        if (tab === 'historial') {
            this.cargarHistorial();
        }
    },

    cargarLotesAbiertos: async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('lotes_ingreso')
                .select('id, fecha, producto, rasos_comprados, rasos_descarte, toritos_obtenidos, quintero_id, quinteros(nombre)')
                .eq('estado', 'abierto')
                .order('id', {ascending: false});
            
            if (error) throw error;
            
            this.lotesAbiertos = data || [];
            const select = document.getElementById('liq-lote-select');
            select.innerHTML = '<option value="">Seleccione un Lote / Remesa...</option>';
            
            this.lotesAbiertos.forEach(l => {
                const nombreQ = l.quinteros ? l.quinteros.nombre : 'Sin nombre';
                const prod = l.producto || 'S/D';
                select.innerHTML += `<option value="${l.id}">Remesa Nº ${l.id} - ${prod} de ${nombreQ} (${l.fecha})</option>`;
            });
        } catch (err) {
            console.error("Error al cargar lotes para liquidación:", err);
            UI.error("No se pudieron cargar los lotes abiertos.");
        }
    },

    cargarLote: async function() {
        const loteId = document.getElementById('liq-lote-select').value;
        const panel = document.getElementById('liq-panel-calculo');
        const tbody = document.getElementById('table-liq-ventas');
        const infoBox = document.getElementById('liq-lote-info');
        const infoQuintero = document.getElementById('liq-info-quintero');
        const infoDetalle = document.getElementById('liq-info-detalle');

        if (!loteId) {
            panel.classList.add('hidden');
            infoBox.classList.add('hidden');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">Seleccione un lote para ver sus ventas</td></tr>';
            this.loteActual = null;
            return;
        }

        this.loteActual = this.lotesAbiertos.find(l => l.id == loteId);
        
        if (this.loteActual) {
            infoQuintero.textContent = this.loteActual.quinteros?.nombre || 'Sin nombre';
            infoDetalle.textContent = `Remesa Nº ${this.loteActual.id} - ${this.loteActual.producto} (${this.loteActual.fecha})`;
            infoBox.classList.remove('hidden');
        }

        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Cargando datos...</td></tr>';
        
        try {
            // 1. Obtener todas las ventas de este lote
            const { data: ventasData, error: ventasError } = await window.supabaseClient
                .from('ventas_detalles')
                .select('id, producto, calibre, cantidad, precio_unitario_neto, envases(equivalencia_bulto)')
                .eq('lote_id', loteId);
                
            if (ventasError) throw ventasError;

            // 1.5 Calcular stock disponible
            const { data: envasesReq } = await window.supabaseClient.from('envases').select('*');
            const envases = envasesReq || [];
            const plantilla = window.appData?.plantilla_productos || [];
            
            let vendidasToritos = 0;
            if (ventasData) {
                ventasData.forEach(v => {
                    const equiv = v.envases ? parseFloat(v.envases.equivalencia_bulto) : 1;
                    vendidasToritos += (v.cantidad * equiv);
                });
            }
            
            const equivNativo = getEquivNativoLote(this.loteActual.producto, envases, plantilla);
            const obtenidosToritos = this.loteActual.toritos_obtenidos * equivNativo;
            const disponiblesToritos = Math.max(0, obtenidosToritos - vendidasToritos);
            const disponiblesNativos = Math.round((disponiblesToritos / equivNativo) * 100) / 100;
            
            const nombreEnvase = getNombreEnvaseNativo(this.loteActual.producto, plantilla);
            
            let textoStock = `${disponiblesNativos} ${nombreEnvase}s`;
            if (disponiblesNativos <= 0) {
                textoStock = `<span class="text-green-600">Todo Vendido (0 ${nombreEnvase}s)</span>`;
            } else {
                textoStock = `<span class="text-blue-600">${disponiblesNativos} ${nombreEnvase}s disponibles</span>`;
            }
            
            document.getElementById('liq-info-stock').innerHTML = textoStock;

            // 2. Obtener gastos fijos configurados del envase específico
            const envaseLote = getNombreEnvaseNativo(this.loteActual.producto, plantilla) || 'Torito';
            const envaseClave = ['Torito', 'Jaulita', 'Bandeja'].includes(envaseLote) ? envaseLote : 'Torito';

            const { data: gastosFijos, error: errorGastos } = await window.supabaseClient
                .from('conceptos_gastos')
                .select('monto_actual')
                .eq('activo', true)
                .eq('tipo_envase', envaseClave);

            let costoBasePorTorito = 0;
            if (gastosFijos) {
                costoBasePorTorito = gastosFijos.reduce((sum, g) => sum + parseFloat(g.monto_actual), 0);
            }
            
            const gastosCalculados = costoBasePorTorito * this.loteActual.toritos_obtenidos;
            
            // 3. Cálculos
            this.ingresosTotales = 0;
            let ventasHTML = '';

            if (!ventasData || ventasData.length === 0) {
                ventasHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay ventas registradas para este lote.</td></tr>';
            } else {
                ventasData.forEach(v => {
                    const totalFila = v.cantidad * v.precio_unitario_neto;
                    this.ingresosTotales += totalFila;
                    ventasHTML += `
                        <tr class="hover:bg-gray-50 group">
                            <td class="px-4 py-3 font-medium">${v.producto || '-'}</td>
                            <td class="px-4 py-3 text-gray-500">${v.calibre || '-'}</td>
                            <td class="px-4 py-3">${v.cantidad}</td>
                            <td class="px-4 py-3 text-green-700">${formatCurrency(v.precio_unitario_neto)}</td>
                            <td class="px-4 py-3 font-bold">${formatCurrency(totalFila)}</td>
                            <td class="px-4 py-3 text-right">
                                <button onclick="liquidaciones.deleteVentaDetalle('${v.id}', ${loteId})" class="text-gray-400 hover:text-red-600 transition" title="Eliminar Venta">
                                    <span class="material-symbols-rounded text-lg">delete</span>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            // 4. Mostrar en UI
            tbody.innerHTML = ventasHTML;
            document.getElementById('liq-ingresos').textContent = formatCurrency(this.ingresosTotales);
            document.getElementById('liq-input-gastos').value = Math.round(gastosCalculados);
            
            this.recalcularRendimiento();
            
            panel.classList.remove('hidden');

        } catch (err) {
            console.error("Error al cargar detalles de liquidación:", err);
            UI.error("Hubo un error calculando la liquidación.");
            panel.classList.add('hidden');
        }
    },

    deleteVentaDetalle: async function(id, loteId) {
        UI.confirm("¿Desea eliminar esta línea de venta? Se eliminará de la factura y de la cuenta corriente del cliente.", async () => {
            try {
                // Necesitamos el comprobante_id para actualizar la cuenta corriente
                const { data: venta, error: vError } = await window.supabaseClient
                    .from('ventas_detalles')
                    .select('comprobante_id, precio_unitario_neto, cantidad')
                    .eq('id', id)
                    .single();
                
                if (vError) throw vError;

                const montoARestar = venta.precio_unitario_neto * venta.cantidad;

                // 1. Eliminar la línea
                const { error: delError } = await window.supabaseClient
                    .from('ventas_detalles')
                    .delete()
                    .eq('id', id);
                
                if (delError) throw delError;

                // 2. Actualizar el comprobante (restar totales)
                // Nota: Esto es simplificado. En un sistema real actualizaríamos el total del comprobante
                // y el movimiento en la cuenta corriente.
                
                // Buscar el movimiento de cuenta asociado al comprobante
                const { data: mov, error: mError } = await window.supabaseClient
                    .from('movimientos_cuenta')
                    .select('id, monto')
                    .eq('comprobante_relacionado_id', venta.comprobante_id)
                    .eq('tipo_movimiento', 'venta')
                    .single();
                
                if (mov) {
                    const nuevoMonto = mov.monto - montoARestar;
                    if (nuevoMonto <= 0) {
                        await window.supabaseClient.from('movimientos_cuenta').delete().eq('id', mov.id);
                        await window.supabaseClient.from('ventas_comprobantes').delete().eq('id', venta.comprobante_id);
                    } else {
                        await window.supabaseClient.from('movimientos_cuenta').update({ monto: nuevoMonto }).eq('id', mov.id);
                        await window.supabaseClient.from('ventas_comprobantes').update({ 
                            total_bruto: nuevoMonto, // Simplificado
                            total_neto: nuevoMonto 
                        }).eq('id', venta.comprobante_id);
                    }
                }

                UI.success("Venta eliminada correctamente.");
                this.cargarLote(); // Recargar tabla
            } catch (err) {
                UI.error("Error al eliminar venta: " + err.message);
            }
        });
    },

    recalcularRendimiento: function() {
        if (!this.loteActual) return;
        
        const gastosTotales = parseFloat(document.getElementById('liq-input-gastos').value) || 0;
        const gananciaNeta = this.ingresosTotales - gastosTotales;
        
        const rasosBuenos = this.loteActual.rasos_comprados - this.loteActual.rasos_descarte;
        const rendimientoPorRaso = rasosBuenos > 0 ? (gananciaNeta / rasosBuenos) : 0;

        document.getElementById('liq-ganancia').textContent = formatCurrency(gananciaNeta);
        document.getElementById('liq-rendimiento').textContent = formatCurrency(rendimientoPorRaso);
        
        // Sugerir precio
        document.getElementById('liq-precio-pagar').value = Math.round(rendimientoPorRaso);
        
        this.actualizarTotal();
    },

    actualizarTotal: function() {
        if (!this.loteActual) return;
        const precio = parseFloat(document.getElementById('liq-precio-pagar').value) || 0;
        const rasosBuenos = this.loteActual.rasos_comprados - this.loteActual.rasos_descarte;
        const totalFinal = precio * rasosBuenos;
        document.getElementById('liq-total-final').textContent = formatCurrency(totalFinal);
    },

    guardarLiquidacion: async function() {
        if (!this.loteActual) return;
        
        const precio = parseFloat(document.getElementById('liq-precio-pagar').value) || 0;
        const rasosBuenos = this.loteActual.rasos_comprados - this.loteActual.rasos_descarte;
        const totalLiquidacion = precio * rasosBuenos;

        if (precio <= 0) {
            UI.confirm("¿Está seguro que el precio a pagar es 0?", () => {
                this.ejecutarGuardado(precio, rasosBuenos, totalLiquidacion);
            }, "¿Precio en Cero?");
        } else {
            this.ejecutarGuardado(precio, rasosBuenos, totalLiquidacion);
        }
    },

    ejecutarGuardado: async function(precio, rasosBuenos, totalLiquidacion) {
        const btnGuardar = document.getElementById('btn-guardar-liq');
        btnGuardar.disabled = true;
        btnGuardar.textContent = "Guardando...";

        try {
            // 1. Cerrar el lote
            const { error: updateError } = await window.supabaseClient
                .from('lotes_ingreso')
                .update({
                    estado: 'liquidado',
                    precio_final_pagado: precio
                })
                .eq('id', this.loteActual.id);
                
            if (updateError) throw updateError;

            // 2. Insertar movimiento en cuenta corriente (Deuda a favor del Quintero)
            const { error: movError } = await window.supabaseClient
                .from('movimientos_cuenta')
                .insert([{
                    tipo_entidad: 'quintero',
                    entidad_id: this.loteActual.quintero_id,
                    comprobante_relacionado_id: this.loteActual.id,
                    detalle: `Liquidación Remesa Nº ${this.loteActual.id} (${rasosBuenos} rasos a ${formatCurrency(precio)})`,
                    tipo_movimiento: 'liquidacion',
                    monto: totalLiquidacion
                }]);

            if (movError) throw movError;

            // 3. Si hubo gastos ingresados, guardarlos para mantener el historial
            const gastosLote = parseFloat(document.getElementById('liq-input-gastos').value) || 0;
            if (gastosLote > 0) {
                await window.supabaseClient.from('gastos_lote').insert([{
                    lote_id: this.loteActual.id,
                    concepto: 'Gastos Galpón / Comisión (Liquidación)',
                    monto_congelado: gastosLote
                }]);
            }

            UI.success("Liquidación guardada exitosamente. La deuda ha sido cargada a la Cuenta Corriente del Quintero.");
            
            // Reset
            document.getElementById('liq-panel-calculo').classList.add('hidden');
            document.getElementById('liq-lote-info').classList.add('hidden');
            document.getElementById('table-liq-ventas').innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">Seleccione un lote para ver sus ventas</td></tr>';
            await this.init();

        } catch (err) {
            console.error("Error al guardar liquidación:", err);
            UI.error("Error al cerrar la liquidación: " + err.message);
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = "Cerrar Lote y Liquidar";
        }
    },

    cargarHistorial: async function() {
        const tbody = document.getElementById('table-historial-remesas');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">Cargando historial...</td></tr>';
        
        try {
            const { data, error } = await window.supabaseClient
                .from('lotes_ingreso')
                .select('id, fecha, producto, rasos_comprados, rasos_descarte, precio_final_pagado, quintero_id, quinteros(nombre)')
                .eq('estado', 'liquidado')
                .order('id', {ascending: false});
            
            if (error) throw error;

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">No hay remesas liquidadas.</td></tr>';
                return;
            }

            const loteIds = data.map(l => l.id);

            // Obtener los movimientos de liquidación para conocer la fecha real de la liquidación
            const { data: movsData, error: mError } = await window.supabaseClient
                .from('movimientos_cuenta')
                .select('comprobante_relacionado_id, fecha')
                .eq('tipo_movimiento', 'liquidacion')
                .in('comprobante_relacionado_id', loteIds);

            // Agrupar por quintero_id + fecha de liquidación
            const agrupado = {};
            data.forEach(lote => {
                const mov = movsData ? movsData.find(m => m.comprobante_relacionado_id === lote.id) : null;
                const fechaLiq = mov ? mov.fecha : lote.fecha; // Fallback por si no tiene movimiento aún

                const key = `${lote.quintero_id}_${fechaLiq}`;
                if (!agrupado[key]) {
                    agrupado[key] = {
                        fecha: fechaLiq,
                        quintero_id: lote.quintero_id,
                        quintero_nombre: lote.quinteros?.nombre || 'S/D',
                        lotes: []
                    };
                }
                agrupado[key].lotes.push(lote);
            });

            this.historialRemesas = Object.values(agrupado);
            // Ordenar historial por fecha de liquidación descendente para que sea cronológico
            this.historialRemesas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            
            let html = '';
            this.historialRemesas.forEach(remesa => {
                const partesFecha = remesa.fecha.split('-');
                const fechaLocal = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
                
                const lotesHTML = remesa.lotes.map(l => `
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-2 rounded-lg border border-gray-200 mb-2 shadow-sm">
                        <div class="mb-2 sm:mb-0">
                            <span class="font-bold text-gray-800">Lote #${l.id}</span> - <span class="text-gray-600">${l.producto}</span>
                            <div class="text-xs text-gray-500 mt-0.5">${l.rasos_comprados - l.rasos_descarte} rasos a <span class="font-bold text-brand-600">${formatCurrency(l.precio_final_pagado)}</span></div>
                        </div>
                        <div class="flex gap-2 w-full sm:w-auto justify-end">
                            <button onclick="liquidaciones.editLiquidacion(${l.id}, ${l.precio_final_pagado}, ${l.rasos_comprados - l.rasos_descarte})" class="p-1.5 text-gray-400 hover:text-brand-600 bg-gray-50 hover:bg-brand-50 rounded transition" title="Editar Precio">
                                <span class="material-symbols-rounded text-[18px]">edit</span>
                            </button>
                            <button onclick="liquidaciones.deleteLiquidacion(${l.id})" class="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded transition" title="Deshacer Liquidación">
                                <span class="material-symbols-rounded text-[18px]">undo</span>
                            </button>
                        </div>
                    </div>
                `).join('');

                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 align-top whitespace-nowrap text-gray-500">${fechaLocal}</td>
                        <td class="px-6 py-4 font-bold text-gray-800 align-top">${remesa.quintero_nombre}</td>
                        <td class="px-6 py-4 align-top">
                            ${lotesHTML}
                        </td>
                        <td class="px-6 py-4 text-right align-top">
                            <button onclick="liquidaciones.imprimirFactura(${remesa.quintero_id}, '${remesa.fecha}')" class="text-brand-600 hover:text-brand-800 font-medium text-sm inline-flex items-center gap-1 justify-end bg-brand-50 px-3 py-2 rounded-lg transition">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                Imprimir Factura
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

        } catch (err) {
            console.error("Error al cargar historial:", err);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">Error cargando historial</td></tr>';
        }
    },

    imprimirFactura: function(quintero_id, fecha) {
        // Encontrar la remesa en el historial
        const remesa = this.historialRemesas.find(r => r.quintero_id == quintero_id && r.fecha === fecha);
        if (!remesa) return;

        const partesFecha = remesa.fecha.split('-');
        const fechaLocal = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

        document.querySelectorAll('.print-fecha').forEach(el => el.textContent = fechaLocal);
        document.querySelectorAll('.print-quintero').forEach(el => el.textContent = remesa.quintero_nombre);

        let html = '';
        let totalGeneral = 0;

        remesa.lotes.forEach(lote => {
            const utiles = lote.rasos_comprados - lote.rasos_descarte;
            const precio = parseFloat(lote.precio_final_pagado) || 0;
            const subtotal = utiles * precio;
            totalGeneral += subtotal;

            html += `
                <tr>
                    <td class="py-2 px-3 border-r border-gray-300 font-medium">${lote.producto || '-'}</td>
                    <td class="py-2 px-3 border-r border-gray-300 text-center">${lote.rasos_comprados}</td>
                    <td class="py-2 px-3 border-r border-gray-300 text-center text-red-600">${lote.rasos_descarte > 0 ? lote.rasos_descarte : '-'}</td>
                    <td class="py-2 px-3 border-r border-gray-300 text-center font-bold">${utiles}</td>
                    <td class="py-2 px-3 border-r border-gray-300 text-right text-gray-600">${formatCurrency(precio)}</td>
                    <td class="py-2 px-3 text-right font-bold text-gray-900">${formatCurrency(subtotal)}</td>
                </tr>
            `;
        });

        document.querySelectorAll('.print-detalles').forEach(el => el.innerHTML = html);
        document.querySelectorAll('.print-total').forEach(el => el.textContent = formatCurrency(totalGeneral));

        // Disparar impresión
        window.print();
    },

    editLiquidacion: async function(lote_id, precio_actual, rasos_buenos) {
        const nuevoPrecioStr = window.prompt(`Editar precio final pagado para el Lote #${lote_id}\n\nIngrese el nuevo precio por raso:`, precio_actual);
        
        if (nuevoPrecioStr === null) return; // Cancelado
        
        const nuevoPrecio = parseFloat(nuevoPrecioStr);
        if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
            UI.error("El precio ingresado no es válido.");
            return;
        }

        if (nuevoPrecio === precio_actual) return; // No hay cambios

        try {
            const nuevoTotal = nuevoPrecio * rasos_buenos;

            // 1. Actualizar el lote
            const { error: errLote } = await window.supabaseClient.from('lotes_ingreso')
                .update({ precio_final_pagado: nuevoPrecio })
                .eq('id', lote_id);
            if (errLote) throw errLote;

            // 2. Actualizar el movimiento de cuenta asociado
            // Primero obtenemos el movimiento (puede haber más de uno si hubo pagos parciales, pero este sistema asume 1 movimiento de liquidación)
            const { data: movs, error: errFindMov } = await window.supabaseClient.from('movimientos_cuenta')
                .select('id, detalle')
                .eq('comprobante_relacionado_id', lote_id)
                .eq('tipo_movimiento', 'liquidacion');
            
            if (errFindMov) throw errFindMov;

            if (movs && movs.length > 0) {
                // Actualizar el monto y el detalle del primer movimiento encontrado
                const nuevoDetalle = `Liquidación Remesa Nº ${lote_id} (${rasos_buenos} rasos a ${formatCurrency(nuevoPrecio)})`;
                const { error: errUpdateMov } = await window.supabaseClient.from('movimientos_cuenta')
                    .update({ monto: nuevoTotal, detalle: nuevoDetalle })
                    .eq('id', movs[0].id);
                if (errUpdateMov) throw errUpdateMov;
            }

            UI.success("Precio de liquidación actualizado.");
            this.cargarHistorial();

        } catch (err) {
            console.error("Error al editar liquidación:", err);
            UI.error("Ocurrió un error al intentar editar la liquidación.");
        }
    },

    deleteLiquidacion: async function(lote_id) {
        UI.confirm("¿Desea deshacer la liquidación del Lote #" + lote_id + "?\nEl lote volverá a estado 'Abierto' para que pueda volver a liquidarlo y se anulará la deuda generada en la cuenta del quintero.", async () => {
            try {
                // 1. Revertir estado del lote a abierto
                const { error: errLote } = await window.supabaseClient.from('lotes_ingreso')
                    .update({ estado: 'abierto', precio_final_pagado: null })
                    .eq('id', lote_id);
                if (errLote) throw errLote;

                // 2. Eliminar movimiento de cuenta (la deuda generada)
                const { error: errMov } = await window.supabaseClient.from('movimientos_cuenta')
                    .delete()
                    .eq('comprobante_relacionado_id', lote_id)
                    .eq('tipo_movimiento', 'liquidacion');
                if (errMov) throw errMov;
                
                // 3. Opcional: Eliminar los gastos fijos guardados para este lote en esa liquidacion
                await window.supabaseClient.from('gastos_lote').delete().eq('lote_id', lote_id);

                UI.success("Liquidación deshecha correctamente. El lote vuelve a estar abierto.");
                this.cargarHistorial();
                this.cargarLotesAbiertos(); // Para que aparezca de nuevo en el select
            } catch (err) {
                console.error("Error al deshacer liquidación:", err);
                UI.error("Error al deshacer: " + err.message);
            }
        });
    }
};

// Eliminado el listener antiguo de DOMContentLoaded para liquidaciones,
// ya que app.js ahora maneja la inicialización mediante triggerModuleInit.
