# Empaque Sapucay

Empaque Sapucay es un sistema de gestión web (Micro-SaaS) diseñado para la administración integral de galpones de empaque hortícola. 

El sistema digitaliza el flujo completo de trabajo: desde la recepción de la mercadería del productor (Quintero), pasando por el proceso de empacado y venta a clientes finales, hasta la liquidación económica y el manejo de cuentas corrientes.

## Características Principales

### 1. Gestión de Lotes y Trazabilidad
El sistema maneja el ingreso de mercadería estructurándolo en lotes. Posee una jerarquía inteligente que permite hacer un seguimiento de los productos procesados. Si un producto es reclasificado o envasado en un formato diferente (por ejemplo, de raso a torito o jaulita), el sistema agrupa de forma automática los sublotes derivados dentro del lote principal (Lote Padre), manteniendo el inventario limpio y la trazabilidad exacta.

### 2. Módulo de Ventas POS (Punto de Venta)
Una interfaz rápida y orientada a pantallas táctiles o dispositivos móviles, ideal para el ritmo acelerado del galpón. Incluye botones preconfigurados por producto y permite cargar múltiples lotes en un mismo comprobante. Además, calcula y prorratea automáticamente los gastos logísticos o de fletes sobre la venta para obtener los valores netos exactos en tiempo real.

### 3. Liquidaciones Automatizadas
Al cerrar un lote, el sistema consolida todas las ventas del lote padre y sus derivados. Deduce los costos de galpón según los gastos configurables por tipo de envase nativo (Torito, Bandeja, Jaulita) y sugiere el precio óptimo a pagarle al productor, garantizando un margen de rentabilidad claro para el empaque.

### 4. Cuentas Corrientes Unificadas
El módulo contable bidireccional centraliza las deudas de los clientes (por compras) y las deudas con los quinteros (por liquidaciones pendientes). Registra cobros parciales o totales y entregas de efectivo, mostrando el saldo a favor o en contra de forma transparente.

### 5. Analítica y Ganancias
Un dashboard interactivo y visual construido con Chart.js provee información clave para la toma de decisiones. Calcula las utilidades puras cruzando los ingresos brutos de las ventas contra los gastos de galpón y el pago final al quintero. Genera gráficos de barras diarios y un gráfico de anillo interactivo con la distribución de ganancias, además de una tabla comparativa para determinar fácilmente qué productos son los más rentables.

## Arquitectura y Tecnologías

El proyecto es una aplicación **Serverless de una sola página (SPA)** construida con:

*   **Frontend:** Vanilla JavaScript (ES6+), HTML5, y CSS3.
*   **Estilos:** Tailwind CSS (vía CDN) y CSS Nativo para un diseño moderno y responsivo.
*   **Base de Datos / Backend:** Supabase (PostgreSQL + PostgREST API).
*   **Interfaz (UI/UX):** Sistema propio de ventanas modales y alertas integradas para una experiencia fluida sin dependencias de librerías externas.

### Por qué esta arquitectura:
Al no requerir compilación mediante Node.js, Webpack, ni frameworks pesados (como React o Angular), el sistema es extremadamente ligero, rápido de ejecutar y sencillo de mantener. Puede alojarse en cualquier servidor estático (como GitHub Pages, Vercel, Netlify) o correr desde el sistema de archivos local a costo nulo.

## Estructura de Directorios

```text
/
├── index.html            # Estructura principal, vistas y modales nativos
├── styles.css            # Estilos personalizados, animaciones y overrides
├── js/
│   ├── app.js            # Enrutador principal y control de navegación
│   ├── supabase.js       # Inicialización de BD y chequeo de conexión
│   ├── utils.js          # Utilidades (formato de moneda, fechas, cálculos nativos)
│   ├── ui.js             # Gestor central de notificaciones y modales
│   ├── dashboard.js      # Resumen general de saldos y cálculo de stock consolidado
│   ├── lotes.js          # Control de ingreso, descartes y agrupación de familias
│   ├── ventas.js         # Motor POS, validación de stock y prorrateo logístico
│   ├── liquidaciones.js  # Lógica de cierre de lote, deducción y fijación de precios
│   ├── cuentas.js        # Historial contable, registro de cobros y pagos
│   ├── ganancias.js      # Motor analítico financiero y generación de gráficos
│   └── catalogs.js       # Configuración (Quinteros, Clientes, Gastos, Envases)
├── sql/                  # Scripts de creación y configuración de la base de datos
```

## Instalación y Despliegue

1. **Base de Datos:** Ejecuta el contenido de `sql/esquema_final.sql` en el SQL Editor de tu proyecto en Supabase para crear las tablas y políticas de seguridad (RLS).
2. **Conexión:** Edita `js/supabase.js` e ingresa la URL y la llave anónima (Anon Key) de tu proyecto de Supabase.
3. **Despliegue:** Sube la carpeta a cualquier servicio de hosting estático o abre `index.html` en cualquier navegador web.
