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
        this.renderizarGrillaBase('table-lote-detalles');

        document.getElementById('modal-lote').classList.remove('hidden');
    },

    renderizarGrillaBase: function(tbodyId) {
        const tbody = document.getElementById(tbodyId);
        tbody.innerHTML = '';
        
        if (window.appData && window.appData.plantilla_productos) {
            window.appData.plantilla_productos.forEach(item => {
                this.agregarFila(item, tbodyId);
            });
        }
    },

    agregarFila: function(plantillaItem, tbodyId) {
        const tbody = document.getElementById(tbodyId);
        const tr = document.createElement('tr');
        tr.className = "fila-lote group hover:bg-gray-50 transition";
        
        // Determinar qué inputs mostrar según si es el form principal o el form de edit
        const isEdit = tbodyId === 'table-edit-detalles';

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
            ${!isEdit ? `
            <td class="px-2 py-2">
                <input type="number" class="input-rasos w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-center" min="0" placeholder="0">
            </td>
            <td class="px-2 py-2">
                <input type="number" class="input-descarte w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-center" min="0" placeholder="0">
            </td>
            ` : ''}
            <td class="px-2 py-2">
                <input type="hidden" class="input-hijo-id" value="">
                <input type="number" class="input-toritos w-full px-2 py-1 border border-green-300 rounded focus:ring-1 focus:ring-green-500 outline-none text-center bg-green-50 text-green-800 font-bold" min="0" placeholder="0">
            </td>
            <td class="px-2 py-2 text-right">
            </td>
        `;
        tbody.appendChild(tr);
    },

    agregarFilaExtra: function() {
        this._agregarFilaLibre('table-lote-detalles');
    },

    agregarFilaExtraEdit: function() {
        this._agregarFilaLibre('table-edit-detalles');
    },

    _agregarFilaLibre: function(tbodyId) {
        const tbody = document.getElementById(tbodyId);
        const tr = document.createElement('tr');
        tr.className = "fila-lote group hover:bg-gray-50 transition bg-gray-50";
        const isEdit = tbodyId === 'table-edit-detalles';
        
        tr.innerHTML = `
            <td class="px-2 py-2">
                <input type="text" placeholder="Otro..." class="input-producto w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-xs">
            </td>
            <td class="px-2 py-2 text-xs text-center">
                <input type="text" placeholder="Calibre" class="input-calibre w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-xs text-center">
            </td>
            ${!isEdit ? `
            <td class="px-2 py-2">
                <input type="number" class="input-rasos w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-center" min="0" placeholder="0">
            </td>
            <td class="px-2 py-2">
                <input type="number" class="input-descarte w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-center" min="0" placeholder="0">
            </td>
            ` : ''}
            <td class="px-2 py-2">
                <input type="hidden" class="input-hijo-id" value="">
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
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">Cargando...</td></tr>';
        
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
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-red-500">Error al cargar datos</td></tr>';
            return;
        }

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No hay lotes registrados.</td></tr>';
            return;
        }

        // Agrupar padres e hijos
        const padres = data.filter(l => !l.lote_padre_id);
        const hijos = data.filter(l => l.lote_padre_id);

        // Ordenar padres: estado 'abierto' primero, luego fecha más reciente, luego id desc
        padres.sort((a, b) => {
            if (a.estado !== b.estado) {
                return a.estado === 'abierto' ? -1 : 1;
            }
            const dateA = new Date(a.fecha).getTime();
            const dateB = new Date(b.fecha).getTime();
            if (dateA !== dateB) {
                return dateB - dateA;
            }
            return b.id - a.id;
        });

        let html = '';
        padres.forEach(p => {
            const partesFecha = p.fecha.split('-');
            const fechaLocal = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
            
            // Fila Padre
            html += `
            <tr class="hover:bg-blue-50 transition group bg-white border-b border-gray-200">
                <td class="px-6 py-4 font-bold text-gray-900">#${p.id}</td>
                <td class="px-6 py-4">${fechaLocal}</td>
                <td class="px-6 py-4 font-medium">${p.quinteros?.nombre || '-'}</td>
                <td class="px-6 py-4 font-bold text-blue-800">${p.producto || 'S/D'}</td>
                <td class="px-6 py-4 font-bold text-gray-800">
                    ${p.rasos_comprados}
                    ${p.rasos_descarte > 0 ? `<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-bold ml-2">-${p.rasos_descarte} desc</span>` : ''}
                </td>
                <td class="px-6 py-4 text-green-600 font-bold">${p.toritos_obtenidos > 0 ? p.toritos_obtenidos : '-'}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${p.estado === 'abierto' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}">
                        ${p.estado}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2">
                        ${p.estado === 'abierto' ? `
                            <button onclick="lotes.editLote(${p.id})" class="p-1 text-gray-400 hover:text-brand-600 transition" title="Editar Padre y Toritos">
                                <span class="material-symbols-rounded text-lg">edit</span>
                            </button>
                            <button onclick="lotes.deleteLote(${p.id})" class="p-1 text-gray-400 hover:text-red-600 transition" title="Eliminar Lote Completo">
                                <span class="material-symbols-rounded text-lg">delete</span>
                            </button>
                        ` : `
                            <span class="p-1 text-gray-300 cursor-not-allowed" title="Lote Liquidado">
                                <span class="material-symbols-rounded text-lg">lock</span>
                            </span>
                        `}
                    </div>
                </td>
            </tr>`;

            // Filas Hijos
            const hijosDelPadre = hijos.filter(h => h.lote_padre_id === p.id);
            hijosDelPadre.sort((a, b) => a.id - b.id); // Ordenar hijos por ID ascendente
            hijosDelPadre.forEach(h => {
                html += `
                <tr class="hover:bg-gray-50 transition group bg-gray-50 border-b border-gray-100">
                    <td class="px-6 py-2 text-gray-500 flex items-center gap-2 pl-10"><span class="material-symbols-rounded text-gray-300">subdirectory_arrow_right</span> #${h.id}</td>
                    <td class="px-6 py-2 text-gray-400 text-sm">↳ Sublote</td>
                    <td class="px-6 py-2 text-gray-400 text-sm">-</td>
                    <td class="px-6 py-2 font-medium text-gray-700">${h.producto || 'S/D'}</td>
                    <td class="px-6 py-2 text-gray-400">-</td>
                    <td class="px-6 py-2 text-green-600 font-bold">${h.toritos_obtenidos}</td>
                    <td class="px-6 py-2"></td>
                    <td class="px-6 py-2 text-right">
                        <!-- El hijo se edita desde el lapiz del padre -->
                    </td>
                </tr>`;
            });
        });
        tbody.innerHTML = html;
    },

    deleteLote: async function(id) {
        UI.confirm("¿Está seguro que desea eliminar este lote? Esto podría afectar el stock disponible. Si es un Lote Padre, se eliminarán todos sus sublotes.", async () => {
            try {
                // Verificar si tiene ventas el lote o sus hijos
                const { data: hijos } = await window.supabaseClient.from('lotes_ingreso').select('id').eq('lote_padre_id', id);
                const idsToCheck = [id];
                if (hijos) idsToCheck.push(...hijos.map(h => h.id));

                const { data: ventas } = await window.supabaseClient
                    .from('ventas_detalles')
                    .select('id')
                    .in('lote_id', idsToCheck);
                
                if (ventas && ventas.length > 0) {
                    UI.error("No se puede eliminar un lote que ya tiene ventas asociadas (incluyendo sublotes).");
                    return;
                }

                // Gastos
                await window.supabaseClient.from('gastos_lote').delete().in('lote_id', idsToCheck);

                // Eliminar lote (hijos se borran por CASCADE en BD, pero por si acaso eliminamos directo)
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
        const { data: padre, error } = await window.supabaseClient
            .from('lotes_ingreso')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error || !padre) return;

        if (padre.estado === 'liquidado') {
            UI.error("No se puede editar un lote que ya ha sido liquidado.");
            return;
        }

        // Obtener hijos
        const { data: hijos } = await window.supabaseClient
            .from('lotes_ingreso')
            .select('*')
            .eq('lote_padre_id', id);

        // Poblar cabecera de edición
        document.getElementById('edit-lote-id').value = padre.id;
        document.getElementById('edit-lote-producto').value = padre.producto;
        document.getElementById('edit-lote-rasos').value = padre.rasos_comprados || 0;
        document.getElementById('edit-lote-descarte').value = padre.rasos_descarte || 0;

        // Renderizar plantilla
        this.renderizarGrillaBase('table-edit-detalles');

        // Llenar toritos de los hijos en la plantilla
        const tbody = document.getElementById('table-edit-detalles');
        const filas = tbody.querySelectorAll('.fila-lote');
        const hijosRenderizados = new Set();

        filas.forEach(tr => {
            const productoGrid = tr.querySelector('.input-producto').value.trim();
            const calibreGrid = tr.querySelector('.input-calibre').value.trim();
            const nombreFinalGrid = calibreGrid ? `${productoGrid} (${calibreGrid})` : productoGrid;

            // Buscar si es el propio padre o un hijo
            if (padre.producto === nombreFinalGrid) {
                tr.querySelector('.input-toritos').value = padre.toritos_obtenidos || 0;
            } else {
                const hijo = hijos?.find(h => h.producto === nombreFinalGrid);
                if (hijo) {
                    tr.querySelector('.input-hijo-id').value = hijo.id;
                    tr.querySelector('.input-toritos').value = hijo.toritos_obtenidos;
                    hijosRenderizados.add(hijo.id);
                }
            }
        });

        // Agregar filas extra para hijos que no estaban en la plantilla
        if (hijos) {
            hijos.forEach(h => {
                if (!hijosRenderizados.has(h.id)) {
                    this.agregarFilaExtraEdit();
                    const trs = tbody.querySelectorAll('.fila-lote');
                    const lastTr = trs[trs.length - 1];

                    // Separar nombre y calibre rudimentariamente si no lo sabemos
                    let prodText = h.producto;
                    let calText = '';
                    if (prodText.includes('(') && prodText.includes(')')) {
                        const parts = prodText.split('(');
                        prodText = parts[0].trim();
                        calText = parts[1].replace(')', '').trim();
                    }

                    lastTr.querySelector('.input-producto').value = prodText;
                    lastTr.querySelector('.input-calibre').value = calText;
                    lastTr.querySelector('.input-hijo-id').value = h.id;
                    lastTr.querySelector('.input-toritos').value = h.toritos_obtenidos;
                }
            });
        }

        document.getElementById('modal-edit-lote').classList.remove('hidden');
    },

    saveEditLote: async function(e) {
        e.preventDefault();
        const padreId = parseInt(document.getElementById('edit-lote-id').value);
        const rasos = parseInt(document.getElementById('edit-lote-rasos').value) || 0;
        const descarte = parseInt(document.getElementById('edit-lote-descarte').value) || 0;

        const btnSubmit = document.getElementById('btn-guardar-edit-lote');
        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.innerHTML = 'Guardando...';
        btnSubmit.disabled = true;

        try {
            // 1. Actualizar Lote Padre
            const { error: padreError } = await window.supabaseClient
                .from('lotes_ingreso')
                .update({ rasos_comprados: rasos, rasos_descarte: descarte })
                .eq('id', padreId);
            
            if (padreError) throw padreError;

            // Para que los hijos hereden fecha y quintero del padre
            const { data: padreData } = await window.supabaseClient.from('lotes_ingreso').select('*').eq('id', padreId).single();

            // 2. Procesar Grilla para Hijos
            const filas = document.querySelectorAll('#table-edit-detalles .fila-lote');
            
            let toritosPadreActualizados = false;
            let totalToritosPadre = 0;

            for (let i = 0; i < filas.length; i++) {
                const tr = filas[i];
                const hijoId = tr.querySelector('.input-hijo-id').value;
                const toritos = parseInt(tr.querySelector('.input-toritos').value) || 0;
                
                const producto = tr.querySelector('.input-producto').value.trim();
                const calibre = tr.querySelector('.input-calibre').value.trim();
                const nombreFinal = calibre ? `${producto} (${calibre})` : producto;

                if (!producto && !hijoId) continue; // Fila vacía, ignorar

                if (nombreFinal === padreData.producto) {
                    totalToritosPadre += toritos;
                    toritosPadreActualizados = true;
                    if (hijoId) {
                        const { data: ventas } = await window.supabaseClient.from('ventas_detalles').select('id').eq('lote_id', hijoId);
                        if (!ventas || ventas.length === 0) {
                            await window.supabaseClient.from('lotes_ingreso').delete().eq('id', hijoId);
                        } else {
                            await window.supabaseClient.from('lotes_ingreso').update({ toritos_obtenidos: 0 }).eq('id', hijoId);
                        }
                    }
                    continue;
                }

                if (hijoId) {
                    // Hijo existente
                    if (toritos > 0) {
                        await window.supabaseClient.from('lotes_ingreso').update({ toritos_obtenidos: toritos }).eq('id', hijoId);
                    } else {
                        const { data: ventas } = await window.supabaseClient.from('ventas_detalles').select('id').eq('lote_id', hijoId);
                        if (ventas && ventas.length > 0) {
                            await window.supabaseClient.from('lotes_ingreso').update({ toritos_obtenidos: 0 }).eq('id', hijoId);
                        } else {
                            await window.supabaseClient.from('lotes_ingreso').delete().eq('id', hijoId);
                        }
                    }
                } else {
                    // Hijo nuevo
                    if (toritos > 0 && producto) {
                        await window.supabaseClient.from('lotes_ingreso').insert([{
                            lote_padre_id: padreId,
                            fecha: padreData.fecha,
                            quintero_id: padreData.quintero_id,
                            producto: nombreFinal,
                            rasos_comprados: 0,
                            rasos_descarte: 0,
                            toritos_obtenidos: toritos,
                            estado: 'abierto'
                        }]);
                    }
                }
            }

            if (toritosPadreActualizados) {
                await window.supabaseClient.from('lotes_ingreso').update({ toritos_obtenidos: totalToritosPadre }).eq('id', padreId);
            }

            UI.success("Lote actualizado correctamente.");
            document.getElementById('modal-edit-lote').classList.add('hidden');
            this.loadLotes();

        } catch (err) {
            UI.error("Error al actualizar: " + err.message);
        } finally {
            btnSubmit.innerHTML = textoOriginal;
            btnSubmit.disabled = false;
        }
    },

    saveLote: async function(e) {
        e.preventDefault();
        
        const fecha = document.getElementById('lote-fecha').value;
        const quintero_id = parseInt(document.getElementById('lote-quintero').value);

        const filas = document.querySelectorAll('#table-lote-detalles .fila-lote');
        const operaciones = [];
        const padresPorFamilia = {};

        // Función para determinar la familia de un producto (ej. "Pto Veteado" -> "pimiento")
        const getFamiliaProducto = (prod) => {
            if (!prod) return '';
            const p = prod.toLowerCase();
            if (p.includes('tomate') || p.includes('cherry')) return 'tomate';
            if (p.includes('pto') || p.includes('pimiento')) return 'pimiento';
            if (p.includes('chaucha')) return 'chaucha';
            if (p.includes('melon') || p.includes('melón')) return 'melon';
            return p.split(' ')[0].trim(); // Por defecto, la primera palabra
        };

        // 1. Primera pasada: Identificar y crear Lotes Padres
        filas.forEach(tr => {
            const rasosInput = tr.querySelector('.input-rasos');
            const rasos = parseInt(rasosInput ? rasosInput.value : 0) || 0;
            const descarteInput = tr.querySelector('.input-descarte');
            const descarte = parseInt(descarteInput ? descarteInput.value : 0) || 0;
            const productoBase = tr.querySelector('.input-producto').value.trim();
            const calibre = tr.querySelector('.input-calibre').value.trim();
            const nombreFinal = calibre ? `${productoBase} (${calibre})` : productoBase;

            if (productoBase && rasos > 0) {
                const nuevoPadreOp = {
                    padre: {
                        fecha,
                        quintero_id,
                        producto: nombreFinal,
                        rasos_comprados: rasos,
                        rasos_descarte: descarte,
                        toritos_obtenidos: 0,
                        estado: 'abierto',
                        lote_padre_id: null
                    },
                    hijos: []
                };
                operaciones.push(nuevoPadreOp);

                // Agrupar por FAMILIA para la segunda pasada
                const familia = getFamiliaProducto(productoBase);
                if (!padresPorFamilia[familia]) {
                    padresPorFamilia[familia] = [];
                }
                padresPorFamilia[familia].push(nuevoPadreOp);
            }
        });

        if (operaciones.length === 0) {
            UI.alert("Debe ingresar al menos una cantidad de Rasos en algún producto para crear un Ingreso.", "Datos incompletos");
            return;
        }

        // 2. Segunda pasada: Asignar Lotes Hijos (toritos)
        let errorValidacion = null;
        filas.forEach(tr => {
            const rasosInput = tr.querySelector('.input-rasos');
            const rasos = parseInt(rasosInput ? rasosInput.value : 0) || 0;
            const toritos = parseInt(tr.querySelector('.input-toritos').value) || 0;
            const productoBase = tr.querySelector('.input-producto').value.trim();
            const calibre = tr.querySelector('.input-calibre').value.trim();
            const nombreFinal = calibre ? `${productoBase} (${calibre})` : productoBase;

            if (productoBase && toritos > 0) {
                const hijo = {
                    fecha,
                    quintero_id,
                    producto: nombreFinal,
                    rasos_comprados: 0,
                    rasos_descarte: 0,
                    toritos_obtenidos: toritos,
                    estado: 'abierto',
                    lote_padre_id: null // Se asigna luego
                };

                const familia = getFamiliaProducto(productoBase);

                if (rasos > 0) {
                    // Si tiene rasos, se auto-asigna a sí mismo (el padre que se creó en esta misma fila)
                    const miPadre = padresPorFamilia[familia]?.find(p => p.padre.producto === nombreFinal && p.padre.rasos_comprados === rasos);
                    if (miPadre) {
                        if (miPadre.padre.producto === nombreFinal) {
                            miPadre.padre.toritos_obtenidos += toritos;
                        } else {
                            miPadre.hijos.push(hijo);
                        }
                    }
                } else {
                    // Si NO tiene rasos, busca un padre de la misma FAMILIA (ej. "pimiento" para "Pto Veteado")
                    const padresPosibles = padresPorFamilia[familia];
                    if (padresPosibles && padresPosibles.length > 0) {
                        // Lo asignamos al primer padre de esta familia que hayamos encontrado
                        const padreAsignado = padresPosibles[0];
                        if (padreAsignado.padre.producto === nombreFinal) {
                            padreAsignado.padre.toritos_obtenidos += toritos;
                        } else {
                            padreAsignado.hijos.push(hijo);
                        }
                    } else {
                        // Hay toritos pero no ingresaron rasos de la familia en ninguna fila
                        errorValidacion = `Ingresaste ${toritos} toritos de "${nombreFinal}", pero no declaraste ningún Raso de la familia "${familia}" (o similar) en este ingreso.`;
                    }
                }
            }
        });

        if (errorValidacion) {
            UI.alert(errorValidacion, "Error de Consistencia");
            return;
        }


        const btnSubmit = document.getElementById('btn-guardar-lotes');
        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.innerHTML = 'Guardando...';
        btnSubmit.disabled = true;

        try {
            for (let op of operaciones) {
                // 1. Insertar Lote Padre
                const { data: dataPadre, error: errPadre } = await window.supabaseClient
                    .from('lotes_ingreso')
                    .insert([op.padre])
                    .select('id')
                    .single();
                
                if (errPadre) throw errPadre;
                const padreId = dataPadre.id;

                // 2. Insertar Lotes Hijos
                if (op.hijos && op.hijos.length > 0) {
                    op.hijos.forEach(h => h.lote_padre_id = padreId);
                    const { error: errHijo } = await window.supabaseClient
                        .from('lotes_ingreso')
                        .insert(op.hijos);
                    if (errHijo) throw errHijo;
                }

                // 3. Gastos
                const envaseLote = getNombreEnvaseNativo(op.padre.producto, window.appData?.plantilla_productos) || 'Torito';
                const envaseClave = ['Torito', 'Jaulita', 'Bandeja'].includes(envaseLote) ? envaseLote : 'Torito';
                const { data: gastosData } = await window.supabaseClient.from('conceptos_gastos').select('*').eq('activo', true);
                
                if (gastosData) {
                    const gastosFiltrados = gastosData.filter(g => (g.tipo_envase || 'Torito') === envaseClave);
                    const gastosInsert = gastosFiltrados.map(g => ({
                        lote_id: padreId,
                        concepto: g.descripcion,
                        monto_congelado: g.monto_actual
                    }));
                    
                    if (gastosInsert.length > 0) {
                        await window.supabaseClient.from('gastos_lote').insert(gastosInsert);
                    }
                }
            }
            
            this.closeModal();
            this.loadLotes();
            UI.success(`Se registraron exitosamente ${operaciones.length} partidas de ingreso.`);

        } catch (err) {
            console.error(err);
            UI.error('Error al guardar: ' + err.message);
        } finally {
            btnSubmit.innerHTML = textoOriginal;
            btnSubmit.disabled = false;
        }
    }
};
