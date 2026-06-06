const cuentas = {
    entidadesDisponibles: [],
    entidadActual: null,

    init: async function() {
        // Iniciando Cuentas Corrientes...
        await this.cargarEntidades();
    },

    cargarEntidades: async function() {
        const tipo = document.getElementById('cuenta-tipo').value;
        const tabla = tipo === 'quintero' ? 'quinteros' : 'clientes';

        try {
            const { data, error } = await window.supabaseClient
                .from(tabla)
                .select('id, nombre')
                .order('nombre');
            
            if (error) throw error;
            
            this.entidadesDisponibles = data || [];
            const select = document.getElementById('cuenta-entidad');
            select.innerHTML = '<option value="">Seleccione...</option>';
            
            this.entidadesDisponibles.forEach(e => {
                select.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
            });
            
            // Reset vista
            document.getElementById('cuenta-resumen-panel').classList.add('hidden');
            document.getElementById('table-movimientos').innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">Seleccione una persona para ver su cuenta corriente</td></tr>';
            document.getElementById('btn-nuevo-pago').classList.add('hidden');
        } catch (err) {
            console.error("Error cargando entidades:", err);
            UI.error("No se pudieron cargar las personas.");
        }
    },

    cargarMovimientos: async function() {
        const tipo = document.getElementById('cuenta-tipo').value;
        const entidadId = document.getElementById('cuenta-entidad').value;
        const tbody = document.getElementById('table-movimientos');
        const panel = document.getElementById('cuenta-resumen-panel');

        if (!entidadId) {
            panel.classList.add('hidden');
            document.getElementById('btn-nuevo-pago').classList.add('hidden');
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">Seleccione una persona para ver su cuenta corriente</td></tr>';
            return;
        }

        this.entidadActual = { tipo, id: parseInt(entidadId) };
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Cargando movimientos...</td></tr>';
        
        try {
            const { data, error } = await window.supabaseClient
                .from('movimientos_cuenta')
                .select('*')
                .eq('tipo_entidad', tipo)
                .eq('entidad_id', entidadId)
                .order('fecha', {ascending: false})
                .order('id', {ascending: false});

            if (error) throw error;

            let totalDeuda = 0; // Liquidaciones (si es quintero) o Ventas (si es cliente)
            let totalPagos = 0; // Pagos hechos (al quintero) o Cobros (del cliente)
            let html = '';

            if (!data || data.length === 0) {
                html = '<tr><td colspan="4" class="text-center py-8 text-gray-500">No hay movimientos registrados.</td></tr>';
            } else {
                data.forEach(m => {
                    const esDeuda = (m.tipo_movimiento === 'liquidacion' || m.tipo_movimiento === 'venta');
                    const esPago = (m.tipo_movimiento === 'pago' || m.tipo_movimiento === 'cobro');
                    
                    const monto = parseFloat(m.monto);
                    if (esDeuda) totalDeuda += monto;
                    if (esPago) totalPagos += monto;

                    html += `
                        <tr class="hover:bg-gray-50 group">
                            <td class="px-4 py-3 text-gray-500 whitespace-nowrap">${m.fecha}</td>
                            <td class="px-4 py-3 font-medium">${m.detalle}</td>
                            <td class="px-4 py-3 text-right text-red-600 font-bold">${esDeuda ? formatCurrency(monto) : ''}</td>
                            <td class="px-4 py-3 text-right text-green-600 font-bold">${esPago ? formatCurrency(monto) : ''}</td>
                            <td class="px-4 py-3 text-right">
                                <div class="flex justify-end gap-2">
                                    ${esPago ? `
                                    <button onclick="cuentas.editPago(${m.id})" class="text-gray-400 hover:text-brand-600 transition" title="Editar Pago">
                                        <span class="material-symbols-rounded text-lg">edit</span>
                                    </button>
                                    <button onclick="cuentas.deleteMovimiento(${m.id})" class="text-gray-400 hover:text-red-600 transition" title="Eliminar Pago">
                                        <span class="material-symbols-rounded text-lg">delete</span>
                                    </button>
                                    ` : `
                                    <span class="text-gray-300 text-xs italic" title="Eliminar/Editar desde su módulo (Ventas o Liquidaciones)">Bloqueado</span>
                                    `}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }

            tbody.innerHTML = html;

            // Actualizar resumen
            document.getElementById('lbl-deuda').textContent = tipo === 'quintero' ? 'Total Liquidado (Deuda nuestra):' : 'Total Ventas (Deuda de ellos):';
            document.getElementById('cuenta-total-deuda').textContent = formatCurrency(totalDeuda);
            document.getElementById('cuenta-total-pagos').textContent = formatCurrency(totalPagos);
            
            const saldo = totalDeuda - totalPagos;
            const saldoEl = document.getElementById('cuenta-saldo');
            const saldoTexto = document.getElementById('cuenta-saldo-texto');
            
            saldoEl.textContent = formatCurrency(Math.abs(saldo));
            if (saldo > 0) {
                saldoEl.className = "font-bold text-lg text-red-600";
                saldoTexto.textContent = tipo === 'quintero' ? "Le debemos al Quintero" : "El Cliente nos debe";
            } else if (saldo < 0) {
                saldoEl.className = "font-bold text-lg text-green-600";
                saldoTexto.textContent = tipo === 'quintero' ? "Tenemos saldo a favor (Pago de más)" : "El Cliente tiene saldo a favor";
            } else {
                saldoEl.className = "font-bold text-lg text-gray-800";
                saldoTexto.textContent = "Cuentas saldadas";
            }

            panel.classList.remove('hidden');
            document.getElementById('btn-nuevo-pago').classList.remove('hidden');

        } catch (err) {
            console.error("Error al cargar movimientos:", err);
            UI.error("No se pudieron cargar los movimientos de cuenta.");
        }
    },

    deleteMovimiento: async function(id) {
        try {
            // Validar antes de pedir confirmación
            const { data: mov, error: errFind } = await window.supabaseClient
                .from('movimientos_cuenta')
                .select('tipo_movimiento')
                .eq('id', id)
                .single();
                
            if (errFind) throw errFind;
            
            if (mov.tipo_movimiento === 'venta' || mov.tipo_movimiento === 'liquidacion') {
                UI.error("No puedes eliminar este registro desde aquí. Ve al módulo correspondiente (Ventas o Liquidaciones) para deshacerlo.");
                return;
            }

            UI.confirm("¿Está seguro que desea eliminar este pago? Esto afectará el saldo de la cuenta.", async () => {
                try {
                    const { error } = await window.supabaseClient
                        .from('movimientos_cuenta')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;

                    UI.success("Pago eliminado.");
                    this.cargarMovimientos();
                } catch (err) {
                    UI.error("Error al eliminar: " + err.message);
                }
            });
        } catch (err) {
            UI.error("Error al validar el movimiento.");
        }
    },

    abrirModalPago: function() {
        document.getElementById('edit-pago-id').value = '';
        document.getElementById('pago-fecha').value = new Date().toLocaleDateString('en-CA');
        document.getElementById('pago-detalle').value = '';
        document.getElementById('pago-monto').value = '';
        document.getElementById('modal-pago').classList.remove('hidden');
        document.getElementById('pago-monto').focus();
    },

    editPago: async function(id) {
        try {
            const { data, error } = await window.supabaseClient
                .from('movimientos_cuenta')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            document.getElementById('edit-pago-id').value = data.id;
            document.getElementById('pago-fecha').value = data.fecha;
            document.getElementById('pago-detalle').value = data.detalle;
            document.getElementById('pago-monto').value = data.monto;
            
            document.getElementById('modal-pago').classList.remove('hidden');
            document.getElementById('pago-monto').focus();
        } catch (err) {
            console.error("Error al cargar pago para editar:", err);
            UI.error("No se pudo cargar el pago para editar.");
        }
    },

    guardarPago: async function(e) {
        e.preventDefault();
        if (!this.entidadActual) return;

        const idEdit = document.getElementById('edit-pago-id').value;
        const fecha = document.getElementById('pago-fecha').value;
        const detalle = document.getElementById('pago-detalle').value;
        const monto = parseFloat(document.getElementById('pago-monto').value);
        
        const tipo_movimiento = this.entidadActual.tipo === 'quintero' ? 'pago' : 'cobro';

        try {
            if (idEdit) {
                // Modo Edición
                const { error } = await window.supabaseClient
                    .from('movimientos_cuenta')
                    .update({
                        fecha,
                        detalle,
                        monto
                    })
                    .eq('id', idEdit);
                if (error) throw error;
                UI.success("Pago actualizado exitosamente.");
            } else {
                // Modo Nuevo
                const { error } = await window.supabaseClient
                    .from('movimientos_cuenta')
                    .insert([{
                        fecha,
                        tipo_entidad: this.entidadActual.tipo,
                        entidad_id: this.entidadActual.id,
                        detalle,
                        tipo_movimiento,
                        monto
                    }]);
                if (error) throw error;
                UI.success("Pago registrado exitosamente.");
            }

            document.getElementById('modal-pago').classList.add('hidden');
            await this.cargarMovimientos(); // Recargar tabla

        } catch (err) {
            console.error("Error al guardar pago:", err);
            UI.error("Error al registrar el pago: " + err.message);
        }
    }
};

// Eliminado el listener antiguo de DOMContentLoaded para cuentas,
// ya que app.js ahora maneja la inicialización mediante triggerModuleInit.
