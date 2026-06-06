const ganancias = {
    chartInstance: null,
    productosChartInstance: null,
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
            // 1. Obtener Lotes Liquidados (PADRES unicamente)
            const { data: lotesData, error: lError } = await window.supabaseClient
                .from('lotes_ingreso')
                .select(`
                    id, 
                    fecha,
                    producto, 
                    precio_final_pagado,
                    rasos_comprados,
                    rasos_descarte,
                    quinteros (nombre)
                `)
                .eq('estado', 'liquidado')
                .is('lote_padre_id', null);
                
            if (lError) throw lError;

            if (!lotesData || lotesData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No hay lotes liquidados registrados.</td></tr>';
                this.renderCards(0, 0, 0);
                return;
            }

            const loteIds = lotesData.map(l => l.id);

            // Obtener todos los hijos de estos lotes
            const { data: hijosData } = await window.supabaseClient
                .from('lotes_ingreso')
                .select('id, lote_padre_id')
                .in('lote_padre_id', loteIds);
            
            const todosLosLoteIds = [...loteIds];
            if (hijosData) {
                hijosData.forEach(h => todosLosLoteIds.push(h.id));
            }

            // 2. Obtener movimientos de cuenta (Liquidaciones) para sacar la fecha exacta de liquidación y el monto pagado
            const { data: movsData, error: mError } = await window.supabaseClient
                .from('movimientos_cuenta')
                .select('comprobante_relacionado_id, fecha, monto')
                .eq('tipo_movimiento', 'liquidacion')
                .in('comprobante_relacionado_id', loteIds);

            if (mError) throw mError;

            // 3. Obtener todas las ventas asociadas a esos lotes (padres e hijos) para sumar Ingresos Netos
            const { data: ventasData, error: vError } = await window.supabaseClient
                .from('ventas_detalles')
                .select('lote_id, precio_unitario_neto, cantidad')
                .in('lote_id', todosLosLoteIds);

            if (vError) throw vError;

            // 3.5 Obtener los gastos registrados para los lotes padre
            const { data: gastosData, error: gError } = await window.supabaseClient
                .from('gastos_lote')
                .select('lote_id, monto_congelado')
                .in('lote_id', loteIds);

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

                // Usamos la fecha de la liquidación (administrativa) tal como solicitó el usuario
                const partes = liquidacion.fecha.split('-');
                const fechaLiq = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
                fechaLiq.setHours(12,0,0,0); // Evitar problemas de timezone

                if (fechaLiq < fechaInicio || fechaLiq > hoy) {
                    continue; // No entra en el filtro
                }

                // Sumar ingresos (padre e hijos)
                const idsFamilia = [lote.id];
                if (hijosData) {
                    hijosData.filter(h => h.lote_padre_id === lote.id).forEach(h => idsFamilia.push(h.id));
                }

                const ventasLote = ventasData ? ventasData.filter(v => idsFamilia.includes(v.lote_id)) : [];
                let ingresosBrutos = 0;
                ventasLote.forEach(v => {
                    ingresosBrutos += (v.precio_unitario_neto * v.cantidad);
                });

                // Sumar gastos del lote
                const gastosLote = gastosData ? gastosData.filter(g => g.lote_id === lote.id) : [];
                let totalGastos = 0;
                gastosLote.forEach(g => {
                    totalGastos += parseFloat(g.monto_congelado || 0);
                });

                const pagadoQuintero = liquidacion.monto;
                const gananciaEmpaque = ingresosBrutos - totalGastos - pagadoQuintero;

                this.datosBase.push({
                    lote_id: lote.id,
                    fecha: liquidacion.fecha,
                    producto: lote.producto,
                    quintero: lote.quinteros?.nombre || 'Desconocido',
                    ingresos: ingresosBrutos,
                    gastos: totalGastos,
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
            this.renderizarProductosReport();
            return;
        }

        // Renderizar tabla
        this.datosBase.forEach(row => {
            totalGanancia += row.ganancia;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-3" data-label="Lote / Fecha">
                    <div class="font-bold text-gray-800">Lote #${row.lote_id}</div>
                    <div class="text-xs text-gray-500">${row.fecha.split('-').reverse().join('/')}</div>
                </td>
                <td class="px-4 py-3" data-label="Producto">
                    <span class="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">${row.producto || '?'}</span>
                </td>
                <td class="px-4 py-3 text-gray-600" data-label="Quintero">${row.quintero}</td>
                <td class="px-4 py-3 text-right text-gray-800 font-medium" data-label="Ingresos">${formatCurrency(row.ingresos)}</td>
                <td class="px-4 py-3 text-right text-orange-600" data-label="Gastos">-${formatCurrency(row.gastos)}</td>
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
            const fechaStr = row.fecha.split('-').reverse().join('/');
            if (!gananciasPorFecha[fechaStr]) {
                gananciasPorFecha[fechaStr] = 0;
            }
            gananciasPorFecha[fechaStr] += row.ganancia;
        });

        const labels = Object.keys(gananciasPorFecha);
        const data = Object.values(gananciasPorFecha);

        this.renderChart(labels, data);
        this.renderizarProductosReport();
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
    },

    renderizarProductosReport: function() {
        const tbodyProd = document.getElementById('table-ganancias-productos');
        if (!tbodyProd) return;

        if (this.datosBase.length === 0) {
            tbodyProd.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No hay datos de productos en este periodo.</td></tr>';
            this.renderProductosChart([], []);
            return;
        }

        // Agrupar por producto
        const plantilla = window.appData?.plantilla_productos || [];
        const agrupado = {};

        this.datosBase.forEach(row => {
            const prod = row.producto || 'Sin Especificar';
            if (!agrupado[prod]) {
                const envase = getNombreEnvaseNativo(prod, plantilla);
                agrupado[prod] = {
                    producto: prod,
                    envase: envase,
                    lotes: 0,
                    ventas: 0,
                    costo: 0,
                    ganancia: 0
                };
            }
            agrupado[prod].lotes += 1;
            agrupado[prod].ventas += row.ingresos;
            agrupado[prod].costo += (row.pagado + row.gastos);
            agrupado[prod].ganancia += row.ganancia;
        });

        // Convertir a array y ordenar por ganancia descendente
        const lista = Object.values(agrupado).sort((a, b) => b.ganancia - a.ganancia);

        // Renderizar tabla
        tbodyProd.innerHTML = lista.map(row => {
            const margen = row.ventas > 0 ? ((row.ganancia / row.ventas) * 100).toFixed(1) : '0.0';
            
            // Badge del envase
            let badgeEnvase = '';
            const envLower = row.envase.toLowerCase();
            if (envLower.includes('torito')) {
                badgeEnvase = '<span class="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold">Torito</span>';
            } else if (envLower.includes('jaulita')) {
                badgeEnvase = '<span class="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold">Jaulita</span>';
            } else if (envLower.includes('bandeja')) {
                badgeEnvase = '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-bold">Bandeja</span>';
            } else {
                badgeEnvase = `<span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-bold">${row.envase}</span>`;
            }

            return `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-4 py-3 font-semibold text-gray-800">${row.producto}</td>
                    <td class="px-4 py-3 text-center">${badgeEnvase}</td>
                    <td class="px-4 py-3 text-center font-medium">${row.lotes}</td>
                    <td class="px-4 py-3 text-right text-gray-700">${formatCurrency(row.ventas)}</td>
                    <td class="px-4 py-3 text-right text-red-500">-${formatCurrency(row.costo)}</td>
                    <td class="px-4 py-3 text-right text-green-700 font-bold bg-green-50/50">${formatCurrency(row.ganancia)}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="px-2 py-1 text-xs rounded font-bold ${row.ganancia >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">
                            ${margen}%
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        // Gráfico de distribución
        // Tomar top 5 y el resto agruparlo en "Otros"
        const labelsChart = [];
        const dataChart = [];
        const coloresModernos = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

        if (lista.length > 5) {
            for (let i = 0; i < 4; i++) {
                if (lista[i] && lista[i].ganancia > 0) {
                    labelsChart.push(lista[i].producto);
                    dataChart.push(lista[i].ganancia);
                }
            }
            let sumaOtros = 0;
            for (let i = 4; i < lista.length; i++) {
                if (lista[i] && lista[i].ganancia > 0) {
                    sumaOtros += lista[i].ganancia;
                }
            }
            if (sumaOtros > 0) {
                labelsChart.push('Otros');
                dataChart.push(sumaOtros);
            }
        } else {
            lista.forEach(row => {
                if (row.ganancia > 0) {
                    labelsChart.push(row.producto);
                    dataChart.push(row.ganancia);
                }
            });
        }

        this.renderProductosChart(labelsChart, dataChart, coloresModernos);
    },

    renderProductosChart: function(labels, data, colores) {
        const ctx = document.getElementById('productosChart');
        if (!ctx) return;

        if (this.productosChartInstance) {
            this.productosChartInstance.destroy();
        }

        if (labels.length === 0) {
            this.productosChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: ['Sin ganancias'], datasets: [{ data: [1], backgroundColor: ['#e5e7eb'] }] },
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
            return;
        }

        this.productosChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colores || ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: { size: 11, weight: '500' },
                            padding: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.raw;
                                return label + ': ' + formatCurrency(value);
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
};

window.ganancias = ganancias;
