/**
 * Calcula los precios netos de una factura aplicando el prorrateo por bulto.
 * @param {Array} detalles - Array de objetos con {id_lote, precio_bruto, cantidad, equiv_bulto}
 * @param {Number} gastosTotales - Gasto de transporte y bajada de la factura
 * @returns {Array} - El mismo array pero con el calculo del precio_neto y descuento aplicado
 */
function calcularProrrateoVenta(detalles, gastosTotales) {
    // 1. Calcular el total de bultos físicos
    let totalBultos = detalles.reduce((sum, item) => {
        return sum + (item.cantidad * item.equiv_bulto);
    }, 0);

    // 2. Si no hay bultos, evitamos dividir por cero
    if (totalBultos === 0) return detalles;

    // 3. Obtener el costo logístico por 1 bulto
    let costoPorBulto = gastosTotales / totalBultos;

    // 4. Mapear los detalles agregando el cálculo final
    return detalles.map(item => {
        let descuentoArticulo = costoPorBulto * item.equiv_bulto;
        let netoUnitario = item.precio_bruto - descuentoArticulo;
        
        return {
            ...item,
            descuento_aplicado: parseFloat(descuentoArticulo.toFixed(2)),
            precio_neto: parseFloat(netoUnitario.toFixed(2)),
            total_neto_linea: parseFloat((netoUnitario * item.cantidad).toFixed(2))
        };
    });
}

/**
 * Formatea un número a moneda (ARS)
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

/**
 * Obtiene la equivalencia_bulto nativa de un producto desde la plantilla
 */
function getEquivNativoLote(productoNombre, envases, plantilla) {
    if (!plantilla || !envases || !productoNombre) return 1.0;
    
    // Buscar en plantilla el producto
    let pInfo = plantilla.find(p => {
        const nombrePlantilla = p.calibre ? `${p.producto} (${p.calibre})` : p.producto;
        return nombrePlantilla.toLowerCase() === productoNombre.toLowerCase() || p.producto.toLowerCase() === productoNombre.toLowerCase();
    });

    if (pInfo) {
        let envMatch = envases.find(e => e.nombre.toLowerCase() === pInfo.envase_nombre.toLowerCase());
        if (envMatch) return parseFloat(envMatch.equivalencia_bulto);
    }
    return 1.0;
}


/**
 * Obtiene el nombre del envase nativo de un producto desde la plantilla
 */
function getNombreEnvaseNativo(productoNombre, plantilla) {
    if (!plantilla || !productoNombre) return 'Bulto';
    
    let pInfo = plantilla.find(p => {
        const nombrePlantilla = p.calibre ? `${p.producto} (${p.calibre})` : p.producto;
        return nombrePlantilla.toLowerCase() === productoNombre.toLowerCase() || p.producto.toLowerCase() === productoNombre.toLowerCase();
    });

    return pInfo ? pInfo.envase_nombre : 'Bulto';
}
