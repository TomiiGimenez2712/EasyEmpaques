# Manual de Usuario - Empaque Sapucay

Bienvenido a Empaque Sapucay, el sistema de gestión diseñado para simplificar el día a día en el galpón. A continuación, encontrarás una guía paso a paso para utilizar cada módulo del sistema.

---

## 1. Módulo "Lotes (Ingreso)"
Aquí es donde comienza el trabajo. Cada vez que un Quintero (productor) trae mercadería al galpón, debes registrarla como un "Lote".

**Cómo usarlo:**
1. Ve a "Lotes (Ingreso)" en el menú izquierdo.
2. Haz clic en el botón azul **"+ Nuevo Lote"**.
3. Selecciona la fecha y el Quintero que trajo la mercadería.
4. Escribe el producto general (ej: Tomate, Pimiento).
5. Ingresa los **Rasos Comprados** (lo que trajo) y los **Rasos de Descarte** (lo podrido/feo). El sistema calculará automáticamente los "Rasos Buenos".
6. Ingresa cuántos **Toritos Obtenidos** armaste después del empaque. Esto se convertirá en tu **Stock de Venta**.
7. Haz clic en **Guardar Lote**.

*Nota sobre agrupaciones:* El sistema ahora es inteligente a la hora de estructurar lotes. Si el producto que ingresas como Raso resulta en un Torito con el mismo producto, en vez de crear un "Sublote" visual extra que ocupe espacio, el sistema lo agrupará directamente en el Lote Padre, facilitando enormemente su lectura visual. Los Lotes Padre siempre tendrán fondo blanco, mientras que los sublotes resultantes (de productos distintos) tendrán fondo gris claro.

---

## 2. Módulo "Ventas & Prorrateo"
Esta es la pantalla de uso diario, optimizada para celulares y tablets, que te permite vender el stock rápidamente.

**Cómo usarlo:**
1. Haz clic en **"+ Nueva Venta"**.
2. Selecciona el Cliente y el número de Comprobante (Remito).
3. Si el cliente debe pagar un flete o gasto de transporte adicional, ingrésalo en **"Gastos Flete/Transporte"**. Este gasto se descontará proporcionalmente del precio bruto de la mercadería para calcular el precio neto final.
4. Toca los botones de colores (Plantilla) para agregar productos rápidamente. También puedes usar el botón gris de abajo para agregar un artículo manual.
5. Para cada artículo, elige desde qué **Lote** se descontará la mercadería.
6. Ingresa la **Cantidad** (bultos) y el **Precio de Venta**. 
7. Cuando termines de armar la venta, haz clic en **"Aplicar Prorrateo"** para que el sistema calcule los precios netos descontando el flete, y luego dale a **"Confirmar y Guardar"**.
   *Nota: El sistema te avisará en rojo si intentas vender más de lo que tienes en stock.*

---

## 3. Módulo "Liquidaciones"
Una vez que terminaste de vender todo (o casi todo) el stock de un Lote, es hora de pagarle al Quintero.

**Cómo usarlo:**
1. En la lista, verás los lotes que están "Activos" (aún no pagados). Notarás que solo se liquidan los Lotes Padre (los sublotes se liquidan indirectamente a través del padre).
2. Haz clic en el botón **"Liquidar"** (icono de dinero verde) junto al lote deseado.
3. El sistema te mostrará cuánto dinero recaudaste en total vendiendo ese lote y **toda su familia de sublotes**.
4. El sistema calculará y sugerirá automáticamente los **"Gastos de Galpón"** sumando los conceptos de gastos fijos activos configurados específicamente para el tipo de envase nativo del lote (Torito, Jaulita o Bandeja) multiplicados por la cantidad de bultos obtenidos. Puedes ajustar este monto manualmente si lo consideras necesario.
5. El sistema te mostrará el "Rendimiento por Raso" (cuánta plata quedó limpia por cada cajón que trajo el quintero) y te sugerirá un precio a pagarle.
6. Ajusta el **"Precio final por Raso"** si lo deseas. Al confirmar, el Lote se cerrará, su registro en el Historial de Liquidaciones se guardará bajo la **Fecha real de la Liquidación**, y la deuda se enviará automáticamente a la cuenta corriente del Quintero.

---

## 4. Módulo "Estado de Cuentas"
Aquí controlas quién te debe plata y a quién le debes. Funciona como una libreta de almacén digital.

**Cómo usarlo:**
1. Selecciona si quieres ver a un "Quintero" o a un "Cliente".
2. Selecciona la persona en la lista.
3. El sistema te mostrará un historial ordenado (lo más nuevo arriba) con todas sus liquidaciones (deuda tuya) o sus ventas (deuda de ellos).
4. **Para registrar un pago:** Haz clic en **"+ Registrar Entrega/Pago"**. Ingresa la fecha, el monto (ej. $100.000) y un detalle ("Entrega en efectivo"). 
5. El saldo se actualizará solo. El color Rojo indica deuda pendiente, el Verde indica saldo a favor.
*Nota de edición:* Todas las funciones de edición (editar precio o cantidad) ahora utilizan modales modernos integrados en la pantalla, en lugar de las alertas feas del navegador web, para una experiencia de usuario ininterrumpida.

---

## 5. Módulo "Ganancias (Reportes)"
Este módulo es la herramienta analítica fundamental. Te muestra el rendimiento financiero del galpón contabilizando los costos e ingresos reales consolidados de los lotes completos.

**Cómo usarlo:**
1. Selecciona el rango de tiempo (ej. "Últimos 30 días").
2. **Gráficos en paralelo:**
   - **Izquierda:** Evolución de ganancias netas por día de liquidación (gráfico de barras).
   - **Derecha:** Distribución porcentual en un gráfico circular de anillo (Doughnut Chart) que te muestra interactivamente el aporte de ganancias neto de cada producto.
3. **Rentabilidad por Producto (Top Convenientes):** Tabla interactiva ubicada en la parte superior del desglose que consolida tus ingresos y gastos. **La fórmula usada aquí incluye la venta total de la familia del lote (padres + hijos) MENOS los gastos logísticos del galpón MENOS el pago final al Quintero.** Esto arroja un % real de rentabilidad, siendo vital para que sepas exactamente qué producto te conviene seguir operando.
4. **Desglose por Lote:** Ubicada en la parte inferior, detalla de forma cronológica cada lote liquidado con sus ingresos (parent + hijos), sus `Gastos Lote`, el monto `Pagado a Quintero` y la `Ganancia Empaque` resultante.

---

## 6. Módulo "Catálogos" (Configuración)
Aquí es donde agregas la información básica del sistema.
*   **Quinteros:** Los productores que te traen mercadería.
*   **Clientes:** Los compradores (puesteros).
*   **Gastos Fijos:** Configura los conceptos de costo fijo de empaque y logística del galpón. Estos costos ahora están categorizados en tres pestañas (**Torito**, **Jaulita**, **Bandeja**), permitiéndote configurar costos de insumos y logística específicos e independientes para cada envase. Al crear o editar un gasto, puedes asociarlo a su envase respectivo en el selector del formulario.
*   **Envases:** Define los tipos de bultos (Torito, Bandeja, Raso, Jaulita). *Ojo:* La "Equivalencia a Bulto" es clave. Si 1 Torito es la medida estándar (1.0), y necesitas 3 Bandejas para hacer 1 Torito, entonces la Bandeja tiene una equivalencia de `0.33`. Esto es vital para el cálculo correcto del stock consolidado.
