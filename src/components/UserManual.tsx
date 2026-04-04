import { useState } from 'react'
import {
  BookOpen, LayoutDashboard, Package, Factory, ShoppingCart, FileText,
  Truck, Users, Kanban, RotateCcw, Building2, Banknote, Wallet, Receipt,
  BarChart3, Settings, CalendarDays, Search, Keyboard, Shield,
  HelpCircle, ArrowLeftRight, ChevronDown, ChevronRight, Lightbulb,
  CheckCircle2, AlertTriangle, Info,
} from 'lucide-react'

interface Section {
  id: string
  icon: React.ElementType
  title: string
  color: string
  content: React.ReactNode
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mt-3">
      <Lightbulb size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 dark:text-amber-300">{children}</p>
    </div>
  )
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 items-start">
      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
      <span className="text-sm text-slate-600 dark:text-gray-300">{children}</span>
    </li>
  )
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-200 mb-2">{title}</h4>
      {children}
    </div>
  )
}


const sections: Section[] = [
  {
    id: 'intro',
    icon: BookOpen,
    title: 'Introducción a Amazonia Concrete ERP',
    color: 'text-amazonia-600 dark:text-amazonia-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Amazonia Concrete ERP es un sistema integral de gestión empresarial diseñado específicamente para empresas
          de manufactura de concreto y productos derivados. El sistema cubre todo el ciclo operativo: desde la gestión
          de materias primas e insumos, pasando por la producción, ventas, facturación, despachos, hasta la contabilidad
          y análisis financiero.
        </p>
        <p className="text-sm text-slate-600 dark:text-gray-300">
          La aplicación es una PWA (Progressive Web App) que puede instalarse en cualquier dispositivo —computador,
          tablet o celular— y funciona con conexión a internet. Soporta modo oscuro, búsqueda global rápida y
          exportación a Excel en la mayoría de módulos.
        </p>
        <SectionBlock title="Roles del sistema">
          <ul className="space-y-1.5">
            <Feature><strong>Administrador:</strong> Acceso total a todos los módulos, configuración del sistema, gestión de usuarios y auditoría.</Feature>
            <Feature><strong>Ventas:</strong> Gestión de clientes, pedidos, cotizaciones, pipeline, pagos, cartera y despachos.</Feature>
            <Feature><strong>Producción:</strong> Órdenes de producción, recetas, inventario de insumos y despachos.</Feature>
            <Feature><strong>Inventario:</strong> Gestión de insumos, productos, movimientos de inventario, proveedores y compras.</Feature>
            <Feature><strong>Contabilidad:</strong> Ventas, pagos, cartera, gastos, compras y reportes financieros.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Primeros pasos">
          <ul className="space-y-1.5">
            <Feature>Inicia sesión con tu correo y contraseña proporcionados por el administrador.</Feature>
            <Feature>El menú lateral izquierdo muestra solo los módulos permitidos según tu rol.</Feature>
            <Feature>Usa <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+K</kbd> (o <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-gray-700 rounded text-xs font-mono">⌘K</kbd> en Mac) para buscar cualquier dato rápidamente.</Feature>
            <Feature>El icono de sol/luna en la barra superior alterna entre modo claro y oscuro.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Puedes instalar la aplicación como app nativa desde tu navegador usando el botón "Instalar" que aparece en la esquina inferior.</Tip>
      </div>
    ),
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    color: 'text-blue-600 dark:text-blue-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El Dashboard es la pantalla principal del sistema. Ofrece una visión general en tiempo real de las métricas
          más importantes de tu negocio mediante tarjetas KPI, gráficos de tendencias y alertas inteligentes.
        </p>
        <SectionBlock title="Indicadores clave (KPIs)">
          <ul className="space-y-1.5">
            <Feature>Ventas del mes actual con comparación al mes anterior.</Feature>
            <Feature>Pedidos pendientes de completar o despachar.</Feature>
            <Feature>Valor total del inventario (insumos × costo unitario).</Feature>
            <Feature>Producción activa: órdenes en proceso.</Feature>
            <Feature>Alertas de stock bajo en insumos críticos.</Feature>
            <Feature>Cartera por cobrar y saldos vencidos.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Gráficos">
          <ul className="space-y-1.5">
            <Feature>Gráfico de ventas de los últimos 30 días con tendencia.</Feature>
            <Feature>Distribución de estados de pedidos (pendiente, en proceso, completado).</Feature>
            <Feature>Top productos más vendidos del período.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Alertas inteligentes">
          <ul className="space-y-1.5">
            <Feature>Stock bajo: insumos por debajo del mínimo configurado.</Feature>
            <Feature>Pedidos sin despachar con fecha de entrega próxima.</Feature>
            <Feature>Cotizaciones por vencer en los próximos días.</Feature>
            <Feature>Clientes sin actividad reciente (en riesgo).</Feature>
            <Feature>Órdenes de producción retrasadas.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Las alertas se calculan automáticamente cada vez que se carga la página. Revisa el Dashboard al inicio de cada jornada.</Tip>
      </div>
    ),
  },
  {
    id: 'inventory',
    icon: Package,
    title: 'Inventario de Insumos',
    color: 'text-amber-600 dark:text-amber-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El módulo de Inventario permite gestionar todas las materias primas e insumos necesarios para la producción.
          Cada insumo tiene un código SKU único, categoría, unidad de medida, stock actual, stock mínimo y costo unitario.
        </p>
        <SectionBlock title="Funcionalidades principales">
          <ul className="space-y-1.5">
            <Feature><strong>Crear insumo:</strong> Botón "Nuevo insumo" para registrar un material con su nombre, SKU, categoría, unidad (kg, L, u, m, etc.), stock inicial, stock mínimo y costo.</Feature>
            <Feature><strong>Editar insumo:</strong> Haz clic en el botón de edición para modificar cualquier campo del insumo.</Feature>
            <Feature><strong>Registrar movimiento:</strong> El botón de flechas abre un modal para registrar entradas (compras, devoluciones) o salidas (consumo, ajustes) de stock. Cada movimiento queda en el historial.</Feature>
            <Feature><strong>Barra de stock:</strong> Indicador visual — rojo si está bajo el mínimo, ámbar si está cercano, verde si está normal.</Feature>
            <Feature><strong>Sugerencias de reorden:</strong> Panel automático que muestra insumos bajo stock con cantidades sugeridas de compra y costo estimado.</Feature>
            <Feature><strong>Importar:</strong> Carga masiva de insumos mediante archivo CSV o Excel con columnas: nombre, categoría, stock, unidad, costo, proveedor.</Feature>
            <Feature><strong>Exportar:</strong> Descarga el inventario actual como archivo Excel.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Categorías de insumos">
          <p className="text-sm text-slate-600 dark:text-gray-300">Las categorías se crean automáticamente al registrar insumos. Ejemplos típicos: Cementos, Agregados, Pigmentos, Químicos, Empaques, Moldes, Fibras.</p>
        </SectionBlock>
        <SectionBlock title="Filtros y búsqueda">
          <ul className="space-y-1.5">
            <Feature>Busca por nombre o código SKU en el campo de búsqueda.</Feature>
            <Feature>Filtra por categoría usando el selector desplegable.</Feature>
            <Feature>Los insumos con stock bajo aparecen resaltados en la tabla.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Configura el stock mínimo de cada insumo según tu consumo semanal promedio. Así las alertas de reorden serán precisas.</Tip>
      </div>
    ),
  },
  {
    id: 'movements',
    icon: ArrowLeftRight,
    title: 'Movimientos de Inventario',
    color: 'text-indigo-600 dark:text-indigo-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Este módulo registra el historial completo de todos los movimientos de inventario: entradas, salidas,
          ajustes, consumos de producción y devoluciones. Es tu registro de trazabilidad para auditoría e inventarios físicos.
        </p>
        <SectionBlock title="Tipos de movimiento">
          <ul className="space-y-1.5">
            <Feature><strong>Entrada (verde):</strong> Compra de insumos, recepción de mercancía, reposición de stock.</Feature>
            <Feature><strong>Salida (rojo):</strong> Consumo manual, mermas, despacho directo, muestras.</Feature>
            <Feature><strong>Ajuste (ámbar):</strong> Correcciones de inventario físico vs. sistema.</Feature>
            <Feature><strong>Producción (azul):</strong> Consumo automático de insumos al completar una orden de producción.</Feature>
            <Feature><strong>Devolución (violeta):</strong> Material retornado por cliente o a proveedor.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Panel visual">
          <ul className="space-y-1.5">
            <Feature><strong>KPIs:</strong> Total de movimientos, entradas, salidas, producción, actividad últimos 7 días, items únicos movidos.</Feature>
            <Feature><strong>Gráfico de barras:</strong> Actividad diaria de los últimos 14 días (entradas vs salidas).</Feature>
            <Feature><strong>Top items:</strong> Los 5 insumos/productos con mayor cantidad de movimientos.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Filtros disponibles">
          <ul className="space-y-1.5">
            <Feature>Tipo de movimiento (entrada, salida, ajuste, producción, devolución).</Feature>
            <Feature>Tipo de item (insumo o producto).</Feature>
            <Feature>Rango de fechas con presets rápidos (hoy, 7 días, 30 días, 90 días).</Feature>
            <Feature>Búsqueda por nombre de item, referencia o notas.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Cada movimiento registra el stock anterior y el nuevo stock, además del usuario que lo realizó. Esto es clave para conciliaciones de inventario.</Tip>
      </div>
    ),
  },
  {
    id: 'production',
    icon: Factory,
    title: 'Producción',
    color: 'text-violet-600 dark:text-violet-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El módulo de Producción gestiona las órdenes de fabricación. Cada orden se basa en una receta que define
          los ingredientes (insumos) necesarios y la cantidad producida. Al completar una orden, el sistema descuenta
          automáticamente los insumos del inventario.
        </p>
        <SectionBlock title="Flujo de producción">
          <ul className="space-y-1.5">
            <Feature><strong>1. Crear orden:</strong> Selecciona producto, receta, cantidad planeada, prioridad (normal/alta/urgente), fechas de inicio y fin, y persona asignada.</Feature>
            <Feature><strong>2. Estado "Planeada":</strong> La orden queda registrada en espera de inicio.</Feature>
            <Feature><strong>3. Estado "En proceso":</strong> La producción ha comenzado físicamente.</Feature>
            <Feature><strong>4. Estado "Terminada":</strong> Al marcar como terminada, se registra la cantidad real producida y se descuentan los insumos automáticamente según la receta × número de lotes.</Feature>
            <Feature><strong>5. Estado "Cancelada":</strong> Se cancela la orden sin afectar inventario.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Recetas">
          <ul className="space-y-1.5">
            <Feature>Cada receta define: producto resultante, cantidad de rendimiento, lista de ingredientes con cantidades.</Feature>
            <Feature>El costo de producción se calcula automáticamente sumando (costo_insumo × cantidad_ingrediente).</Feature>
            <Feature>Un producto puede tener múltiples recetas (variantes de formulación).</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Panel de órdenes">
          <ul className="space-y-1.5">
            <Feature>KPIs: órdenes activas, completadas hoy, eficiencia promedio.</Feature>
            <Feature>Filtra por estado: todas, planeadas, en proceso, terminadas.</Feature>
            <Feature>Vista de tabla con número de orden, producto, cantidades, fechas, estado y acciones.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Verifica la disponibilidad de insumos antes de iniciar una orden de producción. Si algún ingrediente está bajo stock, el sistema lo alertará en el Dashboard.</Tip>
      </div>
    ),
  },
  {
    id: 'sales',
    icon: ShoppingCart,
    title: 'Ventas (Pedidos)',
    color: 'text-emerald-600 dark:text-emerald-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El módulo de Ventas es el corazón comercial del sistema. Aquí se crean, gestionan y facturan los pedidos
          de venta. Cada pedido tiene un cliente asociado, líneas de productos, totales con impuestos,
          estado de entrega y estado de pago.
        </p>
        <SectionBlock title="Crear un pedido">
          <ul className="space-y-1.5">
            <Feature>Selecciona el cliente (se autocarga su lista de precios y descuento predeterminado).</Feature>
            <Feature>Agrega líneas de producto: producto, cantidad, precio unitario, descuento por línea.</Feature>
            <Feature>El subtotal, impuesto (IVA) y total se calculan automáticamente.</Feature>
            <Feature>Define el método de pago, fecha de entrega y notas adicionales.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Estados del pedido">
          <ul className="space-y-1.5">
            <Feature><strong>Pendiente:</strong> Pedido creado, en espera de confirmación o producción.</Feature>
            <Feature><strong>En proceso:</strong> El pedido está siendo preparado o producido.</Feature>
            <Feature><strong>Completado:</strong> Productos listos para despacho.</Feature>
            <Feature><strong>Entregado:</strong> El pedido fue despachado y recibido por el cliente.</Feature>
            <Feature><strong>Cancelado:</strong> El pedido fue anulado.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Facturación">
          <ul className="space-y-1.5">
            <Feature>Genera factura con número consecutivo, fecha, datos del cliente y desglose de productos.</Feature>
            <Feature>La factura se puede descargar como PDF para enviar al cliente.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Registro de pagos desde ventas">
          <ul className="space-y-1.5">
            <Feature>Cada pedido tiene un botón verde "Registrar pago" cuando no está completamente pagado.</Feature>
            <Feature>Puedes registrar pagos parciales; el sistema calcula automáticamente si queda como "Parcial" o "Pagado".</Feature>
            <Feature>Los métodos de pago disponibles: Transferencia, Efectivo, Tarjeta, Cheque, Nequi, Daviplata, Otro.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Convierte cotizaciones aceptadas directamente a pedido de venta con un clic, arrastrando toda la información del cliente y productos.</Tip>
      </div>
    ),
  },
  {
    id: 'quotations',
    icon: FileText,
    title: 'Cotizaciones',
    color: 'text-cyan-600 dark:text-cyan-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Las cotizaciones permiten enviar propuestas formales de precio a clientes potenciales o existentes.
          Cada cotización tiene una fecha de validez y puede convertirse en pedido de venta una vez aceptada.
        </p>
        <SectionBlock title="Ciclo de vida">
          <ul className="space-y-1.5">
            <Feature><strong>Borrador:</strong> Cotización en preparación, no enviada al cliente.</Feature>
            <Feature><strong>Enviada:</strong> La propuesta fue compartida con el cliente.</Feature>
            <Feature><strong>Aceptada:</strong> El cliente aceptó. Puede convertirse en pedido.</Feature>
            <Feature><strong>Rechazada:</strong> El cliente declinó la propuesta.</Feature>
            <Feature><strong>Vencida:</strong> La fecha de validez pasó sin respuesta (se marca automáticamente).</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Funcionalidades">
          <ul className="space-y-1.5">
            <Feature>Crear cotización con cliente, productos, cantidades, precios y descuentos.</Feature>
            <Feature>Definir fecha de validez y estimado de entrega.</Feature>
            <Feature>Convertir cotización aceptada a pedido de venta con un clic.</Feature>
            <Feature>Exportar lista de cotizaciones a Excel.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Revisa las cotizaciones próximas a vencer en el Dashboard. Un seguimiento oportuno puede cerrar la venta.</Tip>
      </div>
    ),
  },
  {
    id: 'purchases',
    icon: Truck,
    title: 'Órdenes de Compra',
    color: 'text-orange-600 dark:text-orange-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El módulo de Compras gestiona las órdenes de compra a proveedores para reponer insumos y materiales.
          Se integra con el módulo de inventario: las sugerencias de reorden generan órdenes de compra pre-llenadas.
        </p>
        <SectionBlock title="Estados de la orden">
          <ul className="space-y-1.5">
            <Feature><strong>Borrador:</strong> Orden en preparación.</Feature>
            <Feature><strong>Enviada:</strong> Orden enviada al proveedor.</Feature>
            <Feature><strong>Recibida parcial:</strong> Se recibió parte del pedido.</Feature>
            <Feature><strong>Recibida:</strong> Todo el material fue recibido.</Feature>
            <Feature><strong>Cancelada:</strong> Orden cancelada.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Funcionalidades">
          <ul className="space-y-1.5">
            <Feature>Crear orden seleccionando proveedor, insumos, cantidades y precios.</Feature>
            <Feature>Definir fecha esperada de entrega.</Feature>
            <Feature>Las sugerencias de reorden desde Inventario pre-llenan la orden de compra.</Feature>
            <Feature>Exportar órdenes a Excel para control contable.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Desde Inventario, el panel de "Sugerencias de reorden" calcula automáticamente las cantidades óptimas de compra basándose en el stock mínimo configurado.</Tip>
      </div>
    ),
  },
  {
    id: 'dispatch',
    icon: Truck,
    title: 'Despachos',
    color: 'text-teal-600 dark:text-teal-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Despachos controla la logística de entrega de pedidos a clientes. Cada despacho está vinculado a un
          pedido de venta y permite programar fecha, hora, conductor, vehículo y dirección de entrega.
        </p>
        <SectionBlock title="Flujo de despacho">
          <ul className="space-y-1.5">
            <Feature><strong>Programado:</strong> Despacho creado con fecha y hora de entrega asignada.</Feature>
            <Feature><strong>En tránsito:</strong> El vehículo salió con la mercancía.</Feature>
            <Feature><strong>Entregado:</strong> El cliente recibió el pedido exitosamente.</Feature>
            <Feature><strong>Fallido:</strong> La entrega no se pudo completar (dirección incorrecta, cliente ausente, etc.).</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Datos del despacho">
          <ul className="space-y-1.5">
            <Feature>Pedido vinculado, cliente y dirección de entrega.</Feature>
            <Feature>Fecha y hora programada.</Feature>
            <Feature>Conductor asignado y placa del vehículo.</Feature>
            <Feature>Lista de productos a despachar con cantidades.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Programa los despachos del día siguiente al final de cada jornada. Así el equipo de logística puede planificar rutas eficientes.</Tip>
      </div>
    ),
  },
  {
    id: 'crm',
    icon: Users,
    title: 'CRM — Clientes',
    color: 'text-blue-600 dark:text-blue-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El CRM es el módulo de gestión de relaciones con clientes. Permite mantener un directorio completo
          de clientes con segmentación, historial de compras, actividades de seguimiento y comunicación por WhatsApp.
        </p>
        <SectionBlock title="Datos del cliente">
          <ul className="space-y-1.5">
            <Feature>Código único, nombre, empresa, correo, teléfono, ciudad.</Feature>
            <Feature>Segmento: <strong>Regular</strong>, <strong>Mayorista</strong> o <strong>VIP</strong> (cada uno con color distintivo).</Feature>
            <Feature>Lista de precios asignada y descuento predeterminado.</Feature>
            <Feature>Notas internas para observaciones del equipo comercial.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Vista 360° del cliente">
          <ul className="space-y-1.5">
            <Feature>Haz clic en cualquier tarjeta de cliente para abrir su perfil completo en página dedicada.</Feature>
            <Feature><strong>6 KPIs:</strong> Ingresos totales, saldo pendiente, número de pedidos, ticket promedio, valor en pipeline, días desde última compra.</Feature>
            <Feature><strong>Indicador de salud:</strong> Activo (compra reciente), Tibio (30-60 días sin comprar), En riesgo (60+ días), Nuevo (sin compras).</Feature>
            <Feature><strong>Timeline unificado:</strong> Todos los eventos del cliente ordenados cronológicamente — pedidos, pagos, cotizaciones, devoluciones.</Feature>
            <Feature><strong>Columna izquierda:</strong> Contacto, notas, acciones WhatsApp, seguimientos con formulario inline.</Feature>
            <Feature><strong>Columna central:</strong> Timeline + listado de pedidos con estado de pago.</Feature>
            <Feature><strong>Columna derecha:</strong> Pagos realizados, cotizaciones, devoluciones.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Seguimientos (Actividades)">
          <ul className="space-y-1.5">
            <Feature>Registra llamadas, emails, visitas, notas y mensajes de WhatsApp como seguimiento.</Feature>
            <Feature>Marca actividades como completadas o pendientes.</Feature>
            <Feature>Las actividades pendientes se muestran como badge naranja en la tarjeta del cliente.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Métricas de salud de la cartera">
          <ul className="space-y-1.5">
            <Feature>CLV promedio (valor de vida del cliente).</Feature>
            <Feature>Tasa de recompra (clientes con 2+ pedidos).</Feature>
            <Feature>Ticket promedio por pedido y pedidos por cliente.</Feature>
            <Feature>Lista de clientes en riesgo (sin actividad en 30+ días).</Feature>
          </ul>
        </SectionBlock>
        <Tip>Usa los botones de WhatsApp para enviar seguimiento post-venta o recordatorio de pago con un clic. Los mensajes se pre-llenan con datos del pedido.</Tip>
      </div>
    ),
  },
  {
    id: 'pipeline',
    icon: Kanban,
    title: 'Pipeline de Ventas',
    color: 'text-pink-600 dark:text-pink-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El Pipeline visualiza las oportunidades de venta en formato Kanban (tablero), organizadas por etapas
          del proceso comercial. Permite hacer seguimiento del embudo de ventas y probabilidad de cierre.
        </p>
        <SectionBlock title="Etapas del pipeline">
          <ul className="space-y-1.5">
            <Feature><strong>Lead:</strong> Prospecto identificado, aún sin contactar.</Feature>
            <Feature><strong>Contactado:</strong> Se realizó primer contacto con el prospecto.</Feature>
            <Feature><strong>Cotizado:</strong> Se envió cotización formal al prospecto.</Feature>
            <Feature><strong>Negociando:</strong> El prospecto está evaluando la propuesta, posible negociación de precio.</Feature>
            <Feature><strong>Ganado:</strong> La oportunidad se cerró exitosamente (se convierte en pedido).</Feature>
            <Feature><strong>Perdido:</strong> La oportunidad no se concretó.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Datos de la oportunidad">
          <ul className="space-y-1.5">
            <Feature>Título descriptivo, cliente asociado, valor estimado.</Feature>
            <Feature>Probabilidad de cierre (%), fecha esperada de cierre.</Feature>
            <Feature>Persona asignada del equipo comercial.</Feature>
            <Feature>Cotización vinculada (si existe).</Feature>
          </ul>
        </SectionBlock>
        <Tip>El valor ponderado del pipeline (valor × probabilidad) te da una proyección realista de ingresos futuros. Revísalo semanalmente.</Tip>
      </div>
    ),
  },
  {
    id: 'returns',
    icon: RotateCcw,
    title: 'Devoluciones',
    color: 'text-red-600 dark:text-red-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El módulo de Devoluciones gestiona las solicitudes de retorno de mercancía (RMA). Cada devolución
          está vinculada a un pedido de venta original y sigue un flujo de aprobación.
        </p>
        <SectionBlock title="Estados">
          <ul className="space-y-1.5">
            <Feature><strong>Pendiente:</strong> Solicitud recibida, en revisión.</Feature>
            <Feature><strong>Aprobada:</strong> La devolución fue autorizada.</Feature>
            <Feature><strong>Completada:</strong> El material fue recibido y se procesó el crédito/reembolso.</Feature>
            <Feature><strong>Rechazada:</strong> La solicitud no aplica.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Datos de la devolución">
          <ul className="space-y-1.5">
            <Feature>Número de devolución, pedido original vinculado, cliente.</Feature>
            <Feature>Fecha, motivo de la devolución, productos y cantidades.</Feature>
            <Feature>Número de nota crédito y método de reembolso.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Analiza los motivos de devolución más frecuentes para mejorar la calidad del producto o el proceso de empaque.</Tip>
      </div>
    ),
  },
  {
    id: 'suppliers',
    icon: Building2,
    title: 'Proveedores',
    color: 'text-stone-600 dark:text-stone-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Directorio centralizado de proveedores. Cada proveedor tiene información de contacto, categoría
          y estado activo/inactivo. Se vincula con las órdenes de compra.
        </p>
        <SectionBlock title="Datos del proveedor">
          <ul className="space-y-1.5">
            <Feature>Nombre de la empresa, persona de contacto, correo, teléfono.</Feature>
            <Feature>Dirección, ciudad, categoría (Materias primas, Empaques, Maquinaria, etc.).</Feature>
            <Feature>Notas internas y estado activo/inactivo.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Funcionalidades">
          <ul className="space-y-1.5">
            <Feature>Vista en tarjetas con filtro por categoría y estado.</Feature>
            <Feature>Búsqueda por nombre, contacto o categoría.</Feature>
            <Feature>Creación, edición y eliminación de proveedores.</Feature>
          </ul>
        </SectionBlock>
      </div>
    ),
  },
  {
    id: 'payments',
    icon: Banknote,
    title: 'Pagos / Tesorería',
    color: 'text-emerald-600 dark:text-emerald-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El módulo de Pagos registra todos los cobros recibidos de clientes. Cada pago se vincula a un pedido
          de venta y el sistema actualiza automáticamente el estado de pago (pendiente, parcial, pagado).
        </p>
        <SectionBlock title="Registro de pagos">
          <ul className="space-y-1.5">
            <Feature>Selecciona pedido de venta, monto, método de pago, referencia bancaria.</Feature>
            <Feature>7 métodos: Transferencia, Efectivo, Tarjeta, Cheque, Nequi, Daviplata, Otro.</Feature>
            <Feature>Al guardar, el sistema recalcula: si la suma de pagos iguala el total del pedido, marca como "Pagado"; si es menor, marca como "Parcial".</Feature>
            <Feature>También puedes registrar pagos directamente desde la página de Ventas con el botón verde.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Panel de tesorería">
          <ul className="space-y-1.5">
            <Feature>KPIs: total recaudado, pagos del mes, promedio por pago, cantidad de transacciones.</Feature>
            <Feature>Desglose por método de pago con tarjetas de colores.</Feature>
            <Feature>Tabla filtrable por fecha, método, cliente y búsqueda.</Feature>
            <Feature>Exportar a Excel.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Registra los pagos el mismo día que se reciben para mantener la cartera actualizada en tiempo real.</Tip>
      </div>
    ),
  },
  {
    id: 'cartera',
    icon: Wallet,
    title: 'Cartera — Cuentas por Cobrar',
    color: 'text-purple-600 dark:text-purple-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Cartera analiza los saldos pendientes por cobrar de todos los clientes. Muestra la antigüedad de la
          deuda y permite priorizar la gestión de cobranza.
        </p>
        <SectionBlock title="Análisis de antigüedad">
          <ul className="space-y-1.5">
            <Feature><strong>Corriente (0-30 días):</strong> Saldos dentro del plazo normal de pago.</Feature>
            <Feature><strong>30-60 días:</strong> Saldos que requieren seguimiento.</Feature>
            <Feature><strong>60-90 días:</strong> Saldos en riesgo, gestión prioritaria.</Feature>
            <Feature><strong>90+ días:</strong> Cartera vencida crítica.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Funcionalidades">
          <ul className="space-y-1.5">
            <Feature>Resumen por cliente con total adeudado y antigüedad promedio.</Feature>
            <Feature>Tabla detallada de pedidos pendientes con fecha, monto y días de mora.</Feature>
            <Feature>Filtros por rango de fechas y búsqueda por cliente.</Feature>
            <Feature>KPIs: total por cobrar, cartera corriente, cartera vencida, promedio de mora.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Prioriza los cobros de cartera mayor a 60 días. Usa el botón de WhatsApp desde el perfil del cliente para enviar recordatorios de pago automáticos.</Tip>
      </div>
    ),
  },
  {
    id: 'expenses',
    icon: Receipt,
    title: 'Gastos',
    color: 'text-rose-600 dark:text-rose-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Registro y control de todos los gastos operativos de la empresa. Permite categorizar, analizar
          tendencias y llevar control del flujo de egresos.
        </p>
        <SectionBlock title="Datos del gasto">
          <ul className="space-y-1.5">
            <Feature>Fecha, categoría (Nómina, Servicios, Transporte, Materiales, etc.).</Feature>
            <Feature>Descripción, monto, beneficiario, método de pago.</Feature>
            <Feature>Opción de marcar como gasto recurrente con período (mensual, quincenal, semanal).</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Funcionalidades">
          <ul className="space-y-1.5">
            <Feature>KPIs: total del mes, gasto promedio diario, top categorías.</Feature>
            <Feature>Filtros por categoría, rango de fechas y búsqueda.</Feature>
            <Feature>Exportar a Excel para conciliación contable.</Feature>
          </ul>
        </SectionBlock>
      </div>
    ),
  },
  {
    id: 'catalog',
    icon: BookOpen,
    title: 'Catálogo de Productos',
    color: 'text-sky-600 dark:text-sky-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El Catálogo permite gestionar los productos terminados que se ofrecen a los clientes. Incluye
          precios, descripciones, imágenes y variantes. También genera un catálogo público compartible.
        </p>
        <SectionBlock title="Productos">
          <ul className="space-y-1.5">
            <Feature>Nombre, SKU, categoría, precio de venta, costo, stock, unidad.</Feature>
            <Feature>Descripción detallada e imagen del producto.</Feature>
            <Feature>Variantes: color, acabado, tamaño — cada una con su propio precio, costo y stock.</Feature>
            <Feature>Vinculación a receta de producción.</Feature>
          </ul>
        </SectionBlock>
        <SectionBlock title="Catálogo público">
          <ul className="space-y-1.5">
            <Feature>Página accesible sin login en la ruta <code className="px-1 py-0.5 bg-slate-100 dark:bg-gray-700 rounded text-xs">/catalogo</code>.</Feature>
            <Feature>Muestra productos activos con imagen, nombre, precio y descripción.</Feature>
            <Feature>Incluye código QR para compartir fácilmente el enlace.</Feature>
            <Feature>Comparte el enlace por WhatsApp a clientes potenciales.</Feature>
          </ul>
        </SectionBlock>
      </div>
    ),
  },
  {
    id: 'calendar',
    icon: CalendarDays,
    title: 'Calendario',
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El Calendario ofrece una vista mensual de todos los eventos relevantes del negocio: fechas de entrega
          de pedidos, despachos programados, vencimientos de cotizaciones y fechas de producción.
        </p>
        <SectionBlock title="Eventos visualizados">
          <ul className="space-y-1.5">
            <Feature>Fechas de entrega de pedidos de venta.</Feature>
            <Feature>Despachos programados con hora y conductor.</Feature>
            <Feature>Fechas de vencimiento de cotizaciones.</Feature>
            <Feature>Fechas planificadas de inicio/fin de producción.</Feature>
            <Feature>Fechas de recepción esperada de compras.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Revisa el calendario al inicio de la semana para anticipar entregas, producciones y vencimientos próximos.</Tip>
      </div>
    ),
  },
  {
    id: 'reports',
    icon: BarChart3,
    title: 'Reportes y Analítica',
    color: 'text-lime-600 dark:text-lime-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Módulo de inteligencia de negocio con gráficos interactivos y métricas avanzadas. Permite analizar
          tendencias de ventas, producción, inventario y finanzas.
        </p>
        <SectionBlock title="Reportes disponibles">
          <ul className="space-y-1.5">
            <Feature>Ventas por período: diario, semanal, mensual con gráfico de tendencia.</Feature>
            <Feature>Ventas por producto: productos más vendidos, ingresos por categoría.</Feature>
            <Feature>Producción: órdenes completadas, eficiencia, costo promedio.</Feature>
            <Feature>Inventario: valorización total, rotación de insumos, nivel de stock.</Feature>
            <Feature>Clientes: top compradores, distribución por segmento, frecuencia de compra.</Feature>
            <Feature>Finanzas: ingresos vs gastos, margen de utilidad, flujo de caja.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Exporta cualquier reporte a Excel para análisis más profundo o para compartir con el equipo directivo.</Tip>
      </div>
    ),
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Configuración',
    color: 'text-slate-600 dark:text-slate-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El módulo de Configuración permite personalizar todos los aspectos del sistema. Solo accesible para usuarios con rol Administrador.
        </p>
        <SectionBlock title="Pestañas de configuración">
          <ul className="space-y-1.5">
            <Feature><strong>Empresa:</strong> Nombre, NIT, dirección, teléfono, correo, logo de la empresa. Estos datos aparecen en facturas y documentos.</Feature>
            <Feature><strong>Usuarios y roles:</strong> Crear, editar y desactivar usuarios. Asignar roles (Administrador, Ventas, Producción, Inventario, Contabilidad). Cambiar contraseñas.</Feature>
            <Feature><strong>Métodos de pago:</strong> Configurar los métodos de pago aceptados y datos bancarios para incluir en facturas y recordatorios.</Feature>
            <Feature><strong>Listas de precios:</strong> Crear listas con porcentaje de descuento. Asignar listas a clientes para precios diferenciados.</Feature>
            <Feature><strong>Impuestos:</strong> Configurar la tasa de IVA y otros impuestos aplicables.</Feature>
            <Feature><strong>Notificaciones:</strong> Activar/desactivar alertas del sistema por categoría.</Feature>
            <Feature><strong>WhatsApp:</strong> Personalizar las plantillas de mensajes para seguimiento y cobranza.</Feature>
            <Feature><strong>Seguridad:</strong> Configurar tiempo de inactividad para cierre de sesión automático. Restablecer sistema a valores de fábrica.</Feature>
            <Feature><strong>Auditoría:</strong> Consultar el registro completo de todas las acciones realizadas en el sistema: quién hizo qué, cuándo y sobre qué entidad.</Feature>
          </ul>
        </SectionBlock>
        <Tip>Revisa el log de auditoría periódicamente para monitorear la actividad del equipo y detectar anomalías.</Tip>
      </div>
    ),
  },
  {
    id: 'shortcuts',
    icon: Keyboard,
    title: 'Atajos de Teclado',
    color: 'text-gray-600 dark:text-gray-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Amazonia ERP incluye atajos de teclado para agilizar la navegación y el trabajo diario.
        </p>
        <SectionBlock title="Atajos disponibles">
          <div className="space-y-2">
            {[
              { keys: 'Ctrl + K / ⌘K', desc: 'Abrir búsqueda global. Busca clientes, pedidos, cotizaciones, productos, proveedores y más.' },
              { keys: '↑ ↓', desc: 'Navegar entre resultados de búsqueda.' },
              { keys: 'Enter', desc: 'Seleccionar resultado y navegar a la página correspondiente.' },
              { keys: 'Escape', desc: 'Cerrar búsqueda global, modales y paneles.' },
            ].map((s) => (
              <div key={s.keys} className="flex gap-3 items-start">
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-gray-700 rounded text-xs font-mono text-slate-700 dark:text-gray-300 flex-shrink-0 min-w-[100px] text-center">{s.keys}</kbd>
                <span className="text-sm text-slate-600 dark:text-gray-300">{s.desc}</span>
              </div>
            ))}
          </div>
        </SectionBlock>
      </div>
    ),
  },
  {
    id: 'roles',
    icon: Shield,
    title: 'Roles y Permisos',
    color: 'text-red-600 dark:text-red-400',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          El sistema de roles controla qué módulos y acciones puede realizar cada usuario.
          Cada usuario tiene exactamente un rol asignado por el administrador.
        </p>
        <SectionBlock title="Matriz de permisos">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-gray-700/50">
                  <th className="text-left px-3 py-2 text-slate-500 dark:text-gray-400 font-semibold">Módulo</th>
                  <th className="text-center px-2 py-2 text-red-600 dark:text-red-400 font-semibold">Admin</th>
                  <th className="text-center px-2 py-2 text-green-600 dark:text-green-400 font-semibold">Ventas</th>
                  <th className="text-center px-2 py-2 text-blue-600 dark:text-blue-400 font-semibold">Producción</th>
                  <th className="text-center px-2 py-2 text-amber-600 dark:text-amber-400 font-semibold">Inventario</th>
                  <th className="text-center px-2 py-2 text-purple-600 dark:text-purple-400 font-semibold">Contabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {[
                  ['Dashboard',     true, true, true, true, true],
                  ['Calendario',    true, true, true, true, true],
                  ['Inventario',    true, false, true, true, false],
                  ['Movimientos',   true, false, false, true, false],
                  ['Producción',    true, false, true, false, false],
                  ['Ventas',        true, true, false, false, true],
                  ['Cotizaciones',  true, true, false, false, false],
                  ['Compras',       true, false, false, true, true],
                  ['Despachos',     true, true, true, false, false],
                  ['CRM / Clientes', true, true, false, false, false],
                  ['Pipeline',      true, true, false, false, false],
                  ['Devoluciones',  true, true, false, false, false],
                  ['Proveedores',   true, false, false, true, true],
                  ['Pagos',         true, true, false, false, true],
                  ['Cartera',       true, true, false, false, true],
                  ['Gastos',        true, false, false, false, true],
                  ['Catálogo',      true, true, false, true, false],
                  ['Reportes',      true, false, false, false, true],
                  ['Configuración', true, false, false, false, false],
                ].map(([mod, ...perms]) => (
                  <tr key={String(mod)}>
                    <td className="px-3 py-1.5 text-slate-700 dark:text-gray-300 font-medium">{String(mod)}</td>
                    {(perms as boolean[]).map((p, i) => (
                      <td key={i} className="text-center px-2 py-1.5">
                        {p ? <CheckCircle2 size={14} className="text-emerald-500 inline" /> : <span className="text-slate-300 dark:text-gray-600">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionBlock>
        <Tip>Los roles se asignan desde Configuración &gt; Usuarios y roles. Un usuario desactivado no puede iniciar sesión pero su historial se conserva.</Tip>
      </div>
    ),
  },
  {
    id: 'faq',
    icon: HelpCircle,
    title: 'Preguntas Frecuentes',
    color: 'text-orange-600 dark:text-orange-400',
    content: (
      <div className="space-y-3">
        {[
          { q: '¿Cómo recupero mi contraseña?', a: 'Contacta al administrador del sistema. Desde Configuración > Usuarios, el admin puede cambiar tu contraseña.' },
          { q: '¿Puedo usar el sistema desde el celular?', a: 'Sí. Amazonia ERP es una PWA responsive que funciona en cualquier navegador. Puedes instalarla como app desde Chrome o Safari.' },
          { q: '¿Los datos se guardan automáticamente?', a: 'Sí. Cada acción (crear, editar, eliminar) se guarda inmediatamente en el servidor. No necesitas un botón "guardar todo".' },
          { q: '¿Cómo exporto datos a Excel?', a: 'La mayoría de módulos tienen un botón "Exportar" en la barra de herramientas. Genera un archivo .xlsx con los datos filtrados actualmente.' },
          { q: '¿Qué pasa si elimino un registro?', a: 'La eliminación es permanente, pero queda registrada en el log de auditoría (Configuración > Auditoría) con el usuario, fecha y hora.' },
          { q: '¿Cómo funcionan las alertas de stock bajo?', a: 'Cuando el stock de un insumo cae por debajo del "stock mínimo" configurado, aparece una alerta en el Dashboard y el insumo se resalta en rojo en Inventario.' },
          { q: '¿Puedo tener múltiples listas de precios?', a: 'Sí. Crea listas en Configuración > Listas de precios con diferentes porcentajes de descuento. Asigna una lista a cada cliente desde su ficha.' },
          { q: '¿Cómo funciona la facturación?', a: 'Desde un pedido de venta, haz clic en "Generar factura". El sistema asigna un número consecutivo y genera un PDF descargable con los datos de tu empresa.' },
          { q: '¿Qué es el restablecimiento de fábrica?', a: 'Borra TODOS los datos del sistema (clientes, pedidos, inventario, etc.) y reinicia con valores predeterminados. Solo disponible para Administradores. Requiere escribir "RESTABLECER" para confirmar.' },
          { q: '¿Cómo envío un mensaje por WhatsApp?', a: 'Desde el perfil del cliente, usa los botones de acciones rápidas WhatsApp. El sistema abre WhatsApp Web/App con un mensaje pre-llenado con datos del pedido.' },
        ].map(({ q, a }) => (
          <div key={q} className="border border-slate-200 dark:border-gray-700 rounded-lg p-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-200 mb-1 flex items-start gap-2">
              <HelpCircle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" /> {q}
            </p>
            <p className="text-sm text-slate-500 dark:text-gray-400 ml-5">{a}</p>
          </div>
        ))}
      </div>
    ),
  },
]

export default function UserManual() {
  const [expanded, setExpanded] = useState<string | null>('intro')
  const [searchQ, setSearchQ] = useState('')

  const filteredSections = searchQ
    ? sections.filter(s => s.title.toLowerCase().includes(searchQ.toLowerCase()))
    : sections

  const toggle = (id: string) => {
    setExpanded(expanded === id ? null : id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen size={20} className="text-amazonia-600 dark:text-amazonia-400" />
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-white">Manual de Usuario</h2>
          <p className="text-sm text-slate-500 dark:text-gray-400">Guía completa de uso del sistema Amazonia Concrete ERP</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9 text-sm"
          placeholder="Buscar en el manual..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
      </div>

      {/* Table of contents */}
      <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4 border border-slate-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">Tabla de contenidos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => { setExpanded(s.id); setSearchQ('') }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                  expanded === s.id
                    ? 'bg-amazonia-100 dark:bg-amazonia-900/30 text-amazonia-700 dark:text-amazonia-400'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={12} className="flex-shrink-0" />
                <span className="truncate">{s.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Accordion sections */}
      <div className="space-y-2">
        {filteredSections.map((section) => {
          const Icon = section.icon
          const isOpen = expanded === section.id
          return (
            <div key={section.id} className="border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggle(section.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                  isOpen
                    ? 'bg-slate-50 dark:bg-gray-700/50'
                    : 'bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isOpen ? 'bg-amazonia-100 dark:bg-amazonia-900/30' : 'bg-slate-100 dark:bg-gray-700'
                }`}>
                  <Icon size={16} className={isOpen ? 'text-amazonia-600 dark:text-amazonia-400' : section.color} />
                </div>
                <span className={`flex-1 font-semibold text-sm ${
                  isOpen ? 'text-amazonia-700 dark:text-amazonia-400' : 'text-slate-700 dark:text-gray-200'
                }`}>
                  {section.title}
                </span>
                {isOpen
                  ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                  : <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                }
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-2 bg-white dark:bg-gray-800 animate-fadeIn">
                  {section.content}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500 pt-4 border-t border-slate-100 dark:border-gray-700">
        <Info size={12} />
        <span>Amazonia Concrete ERP v1.0 — Manual actualizado abril 2026</span>
      </div>
    </div>
  )
}
