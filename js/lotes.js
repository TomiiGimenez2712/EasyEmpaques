const lotes = {
    openLoteModal: async function() {
        document.getElementById('form-lote').reset();
        document.getElementById('lote-fecha').value = new Date().toLocaleDateString('en-CA');
        
        // Load Quinteros for select
        const { data, error } = await window.supabaseClient.from('quinteros').select('id, nombre').eq('estado', 'activo').order('nombre');
        const select = document.getElementById('lote-quintero');
        select.innerHTML = '<option value="">Seleccione...</option>';
        if (data) {
            data.forEach(q => {
                select.innerHTML += `<option value="${q.id}">${q.nombre}</option>`;
            });
        }

        // Renderizar grilla
        this.renderizarGrillaBase();

        document.getElementById('modal-lote').classList.remove('hidden');
    },

    renderizarGrillaBase: function() {
        const tbody = document.getElementById('table-lote-detalles');
        tbody.innerHTML = '';
        
        if (window.appData && window.appData.plantilla_productos) {
            window.appData.plantilla_productos.forEach(item => {
                this.agregarFila(item);
            });
        }
    },

    agregarFila: function(plantillaItem) {
        const tbody = document.getElementById('table-lote-detalles');
        const tr = document.createElement('tr');
        tr.className = "fila-lote group hover:bg-gray-50 transition";
        
        tr.innerHTML = `
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
            <td class="px-2 py-2">
                <input type="number" class="input-rasos w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-center" min="1" placeholder="0">
            </td>
            <td class="px-2 py-2">
                <input type="number" class="input-descarte w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-center" min="0" placeholder="0">
            </td>
            <td class="px-2 py-2">
                <input type="number" class="input-toritos w-full px-2 py-1 border border-green-300 rounded focus:ring-1 focus:ring-green-500 outline-none text-center bg-green-50 text-green-800 font-bold" min="0" placeholder="0">
            </td>
            <td class="px-2 py-2 text-right">
            </td>
        `;
        tbody.appendChild(tr);
    },

    agregarFilaExtra: function() {
        const tbody = document.getElementById('table-lote-detalles');
        const tr = document.createElement('tr');
        tr.className = "fila-lote group hover:bg-gray-50 transition bg-gray-50";
        
        tr.innerHTML = `
            <td class="px-2 py-2">
                <input type="text" placeholder="Otro..." class="input-producto w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-xs">
            </td>
            <td class="px-2 py-2 text-xs text-center">
                <input type="text" placeholder="Calibre" class="input-calibre w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-xs text-center">
            </td>
            <td class="px-2 py-2">
                <input type="number" class="input-rasos w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-center" min="1" placeholder="0">
            </td>
            <td class="px-2 py-2">
                <input type="number" class="input-descarte w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-center" min="0" placeholder="0">
            </td>
            <td class="px-2 py-2">
                <input type="number" class="input-toritos w-full px-2 py-1 border border-green-300 rounded focus:ring-1 focus:ring-green-500 outline-none text-center bg-green-50 text-green-800 font-bold" min="0" placeholder="0">
            </td>
            <td class="px-2 py-2 text-right">
                <button type="button" onclick="this.closest('tr').remove()" class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition font-bold text-lg">
                    &times;
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    closeModal: function() {
        document.getElementById('modal-lote').classList.add('hidden');
    },

    loadLotes: async function() {
        const tbody = document.getElementById('table-lotes');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">Cargando...</td></tr>';
        
        const { data, error } = await window.supabaseClient
            .from('lotes_ingreso')
            .select(`
                *,
                producto,
                quinteros (nombre)
            `)
            .order('id', { ascending: false });
        
        if (error) {
            console.error('Error cargando lotes:', error);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-500">Error al cargar datos</td></tr>';
            return;
        }

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay lotes registrados.</td></tr>';
            return;
        }

        // Formatear la fecha manualmente evitando desfase por UTC
        tbody.innerHTML = data.map(l => {
            // "2026-05-01" -> aDate local timezone -> puede restar 1 día. Mejor parseo manual:
            const partesFecha = l.fecha.split('-');
            const fechaLocal = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

            return `
            <tr class="hover:bg-gray-50 transition group">
                <td class="px-6 py-4 font-medium text-gray-900">#${l.id}</td>
                <td class="px-6 py-4">${fechaLocal}</td>
                <td class="px-6 py-4">${l.quinteros?.nombre || '-'}</td>
                <td class="px-6 py-4">${l.producto || 'S/D'}</td>
                <td class="px-6 py-4">${l.rasos_comprados}</td>
                <td class="px-6 py-4 text-brand-600 font-bold">${l.toritos_obtenidos}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${l.estado === 'abierto' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}">
                        ${l.estado}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2">
                        ${l.estado === 'abierto' ? `
                            <button onclick="lotes.editLote(${l.id})" class="p-1 text-gray-400 hover:text-brand-600 transition" title="Editar">
                                <span class="material-symbols-rounded text-lg">edit</span>
                            </button>
                            <button onclick="lotes.deleteLote(${l.id})" class="p-1 text-gray-400 hover:text-red-600 transition" title="Eliminar">
                                <span class="material-symbols-rounded text-lg">delete</span>
                            </button>
                        ` : `
                            <span class="p-1 text-gray-300 cursor-not-allowed" title="Lote Liquidado (No editable)">
                                <span class="material-symbols-rounded text-lg">lock</span>
                            </span>
                        `}
                    </div>
                </td>
            </tr>
        `}).join('');
    },

    deleteLote: async function(id) {
        UI.confirm("¿Está seguro que desea eliminar este lote? Esto podría afectar el stock disponible.", async () => {
            try {
                // Verificar si tiene ventas
                const { data: ventas, error: vError } = await window.supabaseClient
                    .from('ventas_detalles')
                    .select('id')
                    .eq('lote_id', id);
                
                if (ventas && ventas.length > 0) {
                    UI.error("No se puede eliminar un lote que ya tiene ventas asociadas.");
                    return;
                }

                // Eliminar gastos congelados primero
                await window.supabaseClient.from('gastos_lote').delete().eq('lote_id', id);

                // Eliminar lote
                const { error } = await window.supabaseClient
                    .from('lotes_ingreso')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                UI.success("Lote eliminado correctamente.");
                this.loadLotes();
            } catch (err) {
                console.error(err);
                UI.error("Error al eliminar el lote: " + err.message);
            }
        }, "Eliminar Lote");
    },

    editLote: async function(id) {
        const { data, error } = await window.supabaseClient
            .from('lotes_ingreso')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error || !data) return;

        if (data.estado === 'liquidado') {
            UI.error("No se puede editar un lote que ya ha sido liquidado.");
            return;
        }

        // Poblar modal
        document.getElementById('edit-lote-id').value = data.id;
        document.getElementById('edit-lote-producto').value = data.producto;
        document.getElementById('edit-lote-rasos').value = data.rasos_comprados;
        document.getElementById('edit-lote-descarte').value = data.rasos_descarte || 0;
        document.getElementById('edit-lote-toritos').value = data.toritos_obtenidos || 0;

        document.getElementById('modal-edit-lote').classList.remove('hidden');
    },

    saveEditLote: async function(e) {
        e.preventDefault();
        const id = document.getElementById('edit-lote-id').value;
        const producto = document.getElementById('edit-lote-producto').value;
        const rasos = parseInt(document.getElementById('edit-lote-rasos').value);
        const descarte = parseInt(document.getElementById('edit-lote-descarte').value) || 0;
        const toritos = parseInt(document.getElementById('edit-lote-toritos').value) || 0;

        try {
            // Verificar integridad: No podemos poner menos toritos de los que ya vendimos
            const { data: ventas, error: vError } = await window.supabaseClient
                .from('ventas_detalles')
                .select('cantidad')
                .eq('lote_id', id);
                
            if (vError) throw vError;

            let toritosVendidos = 0;
            if (ventas && ventas.length > 0) {
                toritosVendidos = ventas.reduce((sum, v) => sum + v.cantidad, 0);
            }

            if (toritos < toritosVendidos) {
                UI.error(`Error de integridad: Ya has vendido ${toritosVendidos} unidades de este lote. No puedes reducir el stock total por debajo de esa cifra.`);
                return;
            }

            const { error } = await window.supabaseClient
                .from('lotes_ingreso')
                .update({
                    producto: producto,
                    rasos_comprados: rasos,
                    rasos_descarte: descarte,
                    toritos_obtenidos: toritos
                })
                .eq('id', id);
            
            if (error) throw error;

            UI.success("Lote actualizado correctamente.");
            document.getElementById('modal-edit-lote').classList.add('hidden');
            this.loadLotes();
        } catch (err) {
            UI.error("Error al actualizar: " + err.message);
        }
    },

    saveLote: async function(e) {
        e.preventDefault();
        
        const fecha = document.getElementById('lote-fecha').value;
        const quintero_id = parseInt(document.getElementById('lote-quintero').value);

        const filas = document.querySelectorAll('.fila-lote');
        const remesasAGuardar = [];

        filas.forEach(tr => {
            const rasosInput = tr.querySelector('.input-rasos');
            const rasos = parseInt(rasosInput.value);

            if (rasos > 0) {
                const producto = tr.querySelector('.input-producto').value.trim();
                const calibre = tr.querySelector('.input-calibre').value.trim(); // Podemos guardarlo si la BD lo soportara, o concatenarlo
                const descarte = parseInt(tr.querySelector('.input-descarte').value) || 0;
                const toritos = parseInt(tr.querySelector('.input-toritos').value) || 0;

                const nombreFinal = calibre ? `${producto} (${calibre})` : producto;

                if (producto) {
                    remesasAGuardar.push({
                        fecha,
                        quintero_id,
                        producto: nombreFinal,
                        rasos_comprados: rasos,
                        rasos_descarte: descarte,
                        toritos_obtenidos: toritos,
                        estado: 'abierto'
                    });
                }
            }
        });

        if (remesasAGuardar.length === 0) {
            UI.alert("Debe ingresar al menos una cantidad de Rasos en algún producto.", "Datos incompletos");
            return;
        }

        const btnSubmit = document.getElementById('btn-guardar-lotes');
        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.innerHTML = 'Guardando...';
        btnSubmit.disabled = true;

        try {
            // 1. Insertar Lotes
            const { data: lotesData, error: lotesError } = await window.supabaseClient
                .from('lotes_ingreso')
                .insert(remesasAGuardar)
                .select('id');

            if (lotesError) throw lotesError;

            // 2. Obtener gastos fijos actuales
            const { data: gastosData, error: gastosError } = await window.supabaseClient
                .from('conceptos_gastos')
                .select('*')
                .eq('activo', true);

            if (!gastosError && gastosData && gastosData.length > 0) {
                // 3. Congelar gastos para cada lote insertado
                const gastosInsert = [];
                lotesData.forEach(lote => {
                    gastosData.forEach(g => {
                        gastosInsert.push({
                            lote_id: lote.id,
                            concepto: g.descripcion,
                            monto_congelado: g.monto_actual
                        });
                    });
                });

                const { error: insertGastosError } = await window.supabaseClient
                    .from('gastos_lote')
                    .insert(gastosInsert);
                
                if (insertGastosError) {
                    console.error("No se pudieron congelar los gastos", insertGastosError);
                }
            }
            
            this.closeModal();
            this.loadLotes();
            UI.success(`Se registraron exitosamente ${remesasAGuardar.length} remesas.`);

        } catch (err) {
            console.error(err);
            UI.error('Error al guardar: ' + err.message);
        } finally {
            btnSubmit.innerHTML = textoOriginal;
            btnSubmit.disabled = false;
        }
    }
};

// Eliminado el listener antiguo de DOMContentLoaded para lotes,
// ya que app.js ahora maneja la inicialización mediante triggerModuleInit.
