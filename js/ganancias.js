const ganancias = {
    chartInstance: null,
    datosBase: [], // Cache de los datos crudos

    init: async function() {
        // Cargar por defecto 30 días
        document.getElementById('ganancias-filtro').value = '30';
        await this.cargarDatos();
    },

    cargarDatos: async function() {
        const filtro = document.getElementById('ganancias-filtro').value;
        const tbody = document.getElementById('table-ganancias');
        
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Cargando datos de ganancias...</td></tr>';
        
        try {
            // 1. Obtener Lotes Liquidados
            const { data: lotesData, error: lError } = await window.supabaseClient
                .from('lotes_ingreso')
                .select(`
                    id, 
                    producto, 
                    precio_final_pagado,
                    rasos_comprados,
                    rasos_descarte,
                    quinteros (nombre)
                `)
                .eq('estado', 'liquidado');
                
            if (lError) throw lError;

            if (!lotesData || lotesData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No hay lotes liquidados registrados.</td></tr>';
                this.renderCards(0, 0, 0);
                return;
            }

            const loteIds = lotesData.map(l => l.id);

            // 2. Obtener movimientos de cuenta (Liquidaciones) para sacar la fecha exacta de liquidación y el monto pagado
            const { data: movsData, error: mError } = await window.supabaseClient
                .from('movimientos_cuenta')
                .select('comprobante_relacionado_id, fecha, monto')
                .eq('tipo_movimiento', 'liquidacion')
                .in('comprobante_relacionado_id', loteIds);

            if (mError) throw mError;

            // 3. Obtener todas las ventas asociadas a esos lotes para sumar Ingresos Netos
            const { data: ventasData, error: vError } = await window.supabaseClient
                .from('ventas_detalles')
                .select('lote_id, precio_unitario_neto, cantidad')
                .in('lote_id', loteIds);

            if (vError) throw vError;

            // 4. Mapear y calcular todo
            const hoy = new Date();
            hoy.setHours(23, 59, 59, 999);
            
            let fechaInicio = new Date(0); // Todos los tiempos por defecto
            
            if (filtro === 'hoy') {
                fechaInicio = new Date();
                fechaInicio.setHours(0, 0, 0, 0);
            } else if (filtro === '7') {
                fechaInicio = new Date();
                fechaInicio.setDate(hoy.getDate() - 7);
                fechaInicio.setHours(0,0,0,0);
            } else if (filtro === '30') {
                fechaInicio = new Date();
                fechaInicio.setDate(hoy.getDate() - 30);
                fechaInicio.setHours(0,0,0,0);
            } else if (filtro === 'mes') {
                fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            }

            this.datosBase = [];

            for (const lote of lotesData) {
                // Buscar su liquidación
                const liquidacion = movsData.find(m => m.comprobante_relacionado_id === lote.id);
                // Si no tiene liquidación en cuenta, es raro, omitimos o usamos fallback
                if (!liquidacion) continue;

                const fechaLiq = new Date(liquidacion.fecha);
                fechaLiq.setHours(12,0,0,0); // Evitar problemas de timezone

                if (fechaLiq < fechaInicio || fechaLiq > hoy) {
                    continue; // No entra en el filtro
                }

                // Sumar ingresos
                const ventasLote = ventasData.filter(v => v.lote_id === lote.id);
                let ingresosBrutos = 0;
                ventasLote.forEach(v => {
                    ingresosBrutos += (v.precio_unitario_neto * v.cantidad);
                });

                const pagadoQuintero = liquidacion.monto;
                const gananciaEmpaque = ingresosBrutos - pagadoQuintero;

                this.datosBase.push({
                    lote_id: lote.id,
                    fecha: liquidacion.fecha,
                    producto: lote.producto,
                    quintero: lote.quinteros?.nombre || 'Desconocido',
                    ingresos: ingresosBrutos,
                    pagado: pagadoQuintero,
                    ganancia: gananciaEmpaque
                });
            }

            // Ordenar por fecha desc
            this.datosBase.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            this.renderizarVista();

        } catch (err) {
            console.error("Error al cargar ganancias:", err);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">Error al cargar datos.</td></tr>';
        }
    },

    renderizarVista: function() {
        const tbody = document.getElementById('table-ganancias');
        tbody.innerHTML = '';

        let totalGanancia = 0;
        let conteoLotes = this.datosBase.length;

        if (conteoLotes === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No hay ganancias registradas en este periodo.</td></tr>';
            this.renderCards(0, 0, 0);
            this.renderChart([]);
            return;
        }

        // Renderizar tabla
        this.datosBase.forEach(row => {
            totalGanancia += row.ganancia;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-3" data-label="Lote / Fecha">
                    <div class="font-bold text-gray-800">Lote #${row.lote_id}</div>
                    <div class="text-xs text-gray-500">${new Date(row.fecha).toLocaleDateString('es-AR')}</div>
                </td>
                <td class="px-4 py-3" data-label="Producto">
                    <span class="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">${row.producto || '?'}</span>
                </td>
                <td class="px-4 py-3 text-gray-600" data-label="Quintero">${row.quintero}</td>
                <td class="px-4 py-3 text-right text-gray-800 font-medium" data-label="Ingresos">${formatCurrency(row.ingresos)}</td>
                <td class="px-4 py-3 text-right text-red-600" data-label="Pagado">-${formatCurrency(row.pagado)}</td>
                <td class="px-4 py-3 text-right text-green-700 font-bold bg-green-50" data-label="Ganancia">${formatCurrency(row.ganancia)}</td>
            `;
            tbody.appendChild(tr);
        });

        // Actualizar Tarjetas
        const promedio = totalGanancia / conteoLotes;
        this.renderCards(totalGanancia, conteoLotes, promedio);

        // Agrupar por fecha para el gráfico
        const gananciasPorFecha = {};
        // Para asegurar que las fechas estén ordenadas en el gráfico (ascendente)
        const datosAsc = [...this.datosBase].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        
        datosAsc.forEach(row => {
            const fechaStr = new Date(row.fecha).toLocaleDateString('es-AR');
            if (!gananciasPorFecha[fechaStr]) {
                gananciasPorFecha[fechaStr] = 0;
            }
            gananciasPorFecha[fechaStr] += row.ganancia;
        });

        const labels = Object.keys(gananciasPorFecha);
        const data = Object.values(gananciasPorFecha);

        this.renderChart(labels, data);
    },

    renderCards: function(total, conteo, promedio) {
        document.getElementById('ganancias-total-label').textContent = formatCurrency(total);
        document.getElementById('ganancias-lotes-label').textContent = conteo;
        document.getElementById('ganancias-promedio-label').textContent = formatCurrency(promedio);
    },

    renderChart: function(labels, data) {
        const ctx = document.getElementById('gananciasChart');
        if (!ctx) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        if (labels.length === 0) {
            // Dibujar algo vacío
            this.chartInstance = new Chart(ctx, {
                type: 'bar',
                data: { labels: ['Sin datos'], datasets: [{ data: [0] }] },
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
            return;
        }

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ganancia Diaria Neta ($)',
                    data: data,
                    backgroundColor: '#10b981', // green-500
                    borderRadius: 4,
                    hoverBackgroundColor: '#059669' // green-600
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let value = context.raw;
                                return 'Ganancia: ' + new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString('es-AR');
                            }
                        }
                    }
                }
            }
        });
    }
};

window.ganancias = ganancias;
