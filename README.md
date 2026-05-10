# EasyEmpaque

EasyEmpaque es un sistema de gestión web (Micro-SaaS) diseñado para la administración integral de galpones de empaque hortícola. 

El sistema digitaliza el flujo completo de trabajo: desde la recepción de la mercadería del productor (Quintero), pasando por el proceso de empacado y venta a clientes finales, hasta la liquidación económica y el manejo de cuentas corrientes.

## Características Principales

*   **Gestión de Lotes (Ingresos):** Registro de la entrada de mercadería, separación por descartes y conversión a "Toritos" (bultos de venta).
*   **Módulo de Ventas Rápido:** Interfaz orientada a dispositivos móviles (táctil) con botones rápidos preconfigurados por colores según el producto. Permite venta de múltiples lotes con prorrateo automático de gastos de flete.
*   **Liquidaciones:** Cálculo automático de la ganancia neta por lote, sugiriendo el precio a pagar al quintero basado en el rendimiento de los rasos comprados.
*   **Cuentas Corrientes Unificadas:** Sistema de balance bidireccional que maneja las deudas a favor del quintero (liquidaciones) y las deudas de los clientes (ventas), permitiendo registrar entregas de dinero y pagos parciales.
*   **Reporte de Ganancias:** Dashboard gráfico interactivo para medir el rendimiento y beneficio neto del empaque por períodos (Día, Semana, Mes).

## Arquitectura y Tecnologías

El proyecto es una aplicación **Serverless de una sola página (SPA)** construida con:

*   **Frontend:** Vanilla JavaScript (ES6+), HTML5, y CSS3.
*   **Estilos:** Tailwind CSS (vía CDN) para un diseño responsivo, limpio y rápido.
*   **Base de Datos / Backend:** Supabase (PostgreSQL + PostgREST API).
*   **Gráficos:** Chart.js.

### Por qué esta arquitectura:
Al no requerir Node.js, Webpack, ni ningún framework reactivo pesado (como React o Angular) para compilar, el sistema es ridículamente rápido y fácil de desplegar. El archivo `index.html` puede alojarse en cualquier servidor estático (como GitHub Pages, Vercel o Netlify) a costo $0.

## Estructura de Directorios

```text
/
├── index.html            # Estructura principal y plantillas de las vistas
├── styles.css            # Estilos personalizados (CSS puro)
├── js/
│   ├── app.js            # Enrutador principal y control del Menú
│   ├── supabase.js       # Inicialización del cliente de BD
│   ├── utils.js          # Funciones compartidas (formato moneda, fechas)
│   ├── ui.js             # Gestor de Modales y Notificaciones
│   ├── dashboard.js      # Vista de Resumen y Stock Físico
│   ├── lotes.js          # Lógica de ingreso de mercadería
│   ├── ventas.js         # Motor de ventas y prorrateo (Plantillas)
│   ├── liquidaciones.js  # Cálculo de ganancias y pagos a quinteros
│   ├── cuentas.js        # Manejo de cuentas corrientes y pagos
│   ├── ganancias.js      # Lógica del reporte gráfico y financiero
│   └── catalogs.js       # Mantenimiento de Quinteros, Clientes y Envases
├── sql/                  # (Solo Desarrollo) Scripts de base de datos
```

## Instalación y Despliegue

1. **Base de Datos:** Ejecuta el contenido de `sql/reset_database_full.sql` en el SQL Editor de tu proyecto en Supabase para construir la base de datos inicial con los datos de prueba.
2. **Conexión:** Asegúrate de que las credenciales en `js/supabase.js` coincidan con tu proyecto de Supabase.
3. **Despliegue:** Sube la carpeta a cualquier servicio de hosting estático o abre `index.html` directamente en tu navegador web.
