// ──────────────────────────────────────────────
//  MOCK DATA — AMAZONIA CONCRETE ERP
// ──────────────────────────────────────────────

export interface Supply {
  id: string; sku: string; name: string; category: string
  unit: string; stock: number; minStock: number; cost: number
  supplier?: string
}

export interface ProductVariant {
  id: string
  sku: string
  attributes: { color?: string; acabado?: string }
  priceOverride?: number
  costOverride?: number
  stock: number
  isActive: boolean
}

export interface Product {
  id: string; sku: string; name: string; category: string
  unit: string; stock: number; price: number; cost: number
  isActive: boolean; recipeId?: string; image?: string; description?: string
  variants?: ProductVariant[]
}

export interface Recipe {
  id: string; name: string; productId: string
  yieldQty: number; yieldUnit: string
  ingredients: { supplyId: string; supplyName: string; qty: number; unit: string; cost: number }[]
  totalCost: number; costPerUnit: number
}

export interface ProductionOrder {
  id: string; orderNumber: string; recipe: string; product: string; recipeId?: string
  plannedQty: number; actualQty?: number; rejectedQty?: number
  status: 'pending' | 'in_progress' | 'finished' | 'cancelled'
  priority: 1|2|3|4|5; plannedStart: string; plannedEnd: string
  estimatedCost: number; actualCost?: number; assignedTo: string
  finishedAt?: string           // ISO datetime the order was finalized
  actualIngredients?: { supplyId: string; supplyName: string; qty: number; unit: string }[]
  notes?: string                // free-text at finish (issues, comments)
}

export interface PriceList {
  id: string
  name: string          // e.g. "Mayorista", "Distribuidor", "VIP"
  discountPercent: number // global discount % for this list (0-100)
  isActive: boolean
}

export interface Customer {
  id: string; code: string; name: string; company?: string
  email: string; phone: string; city: string; segment: string
  totalPurchases: number; lastPurchase: string; isActive: boolean
  notes?: string
  priceListId?: string   // assigned price list
  defaultDiscount?: number // default discount % for this customer (0-100)
  paymentTerms?: number  // credit days from order.date to due date (0 = contado, 15 = Net-15, 30 = Net-30)
  creditLimit?: number   // max outstanding balance allowed (COP)
}

export interface OrderItem {
  product: string; productId?: string; variantId?: string
  qty: number; price: number; discount?: number; subtotal: number
}

export interface SaleOrder {
  id: string; orderNumber: string; customer: string; customerId: string
  items: OrderItem[]
  subtotal: number; discount?: number; tax: number; total: number; status: string
  paymentStatus: string; paymentMethod: string; date: string; deliveryDate?: string
  notes?: string
  priceListId?: string
  // Invoice fields
  invoiceNumber?: string   // e.g. FAC-2025-0001
  invoiceDate?:   string   // ISO date when invoice was generated
}

export type PipelineStage = 'lead' | 'contacted' | 'quoted' | 'negotiating' | 'won' | 'lost'

export interface Opportunity {
  id:               string
  title:            string         // short opportunity name
  customerId:       string
  customer:         string
  stage:            PipelineStage
  value:            number         // estimated $ value
  probability:      number         // 0-100
  expectedClose?:   string         // ISO date
  assignedTo?:      string
  quotationId?:     string         // linked quotation
  notes?:           string
  lostReason?:      string
  createdAt:        string         // ISO date
  updatedAt:        string
}

export type ExpenseCategory =
  | 'Nómina' | 'Arriendo' | 'Servicios públicos' | 'Transporte'
  | 'Marketing' | 'Materiales' | 'Mantenimiento' | 'Impuestos' | 'Otros'

export interface Expense {
  id:            string
  date:          string          // ISO date
  category:      ExpenseCategory
  description:   string
  amount:        number
  beneficiary?:  string          // supplier / employee
  paymentMethod: string
  notes?:        string
  recurring:     boolean
  period?:       'once' | 'weekly' | 'monthly' | 'annual'
}

export interface DeliveryAttempt {
  date:    string   // ISO datetime when the failed attempt was logged
  reason:  string   // Short reason code/label (e.g. "Cliente ausente")
  notes?:  string   // Extra detail (e.g. "Llamar antes de ir")
  driver?: string   // Who tried
}

export interface Dispatch {
  id:              string
  dispatchNumber:  string   // DSP-2025-0001
  saleOrderId:     string
  saleOrderNumber: string
  customer:        string
  customerId:      string
  address?:        string
  scheduledDate:   string   // ISO date
  scheduledTime?:  string   // HH:MM
  driver:          string
  vehiclePlate?:   string
  status:          'scheduled' | 'in_transit' | 'delivered' | 'failed' | 'cancelled'
  deliveredAt?:    string   // ISO date
  deliveryNotes?:  string
  deliveryAttempts?: DeliveryAttempt[]   // History of failed delivery attempts
  deliveryProof?: {
    photo?: string    // base64 data URL, resized ≤ 800px wide
    lat?: number
    lng?: number
    capturedAt: string  // ISO datetime
  }
  items:           { product: string; qty: number }[]
  total:           number
  date:            string   // creation date
}

export interface PurchaseOrderItem {
  supplyId: string
  supplyName: string
  unit: string
  qty: number
  unitCost: number
  subtotal: number
  receivedQty?: number
}

export interface PurchaseOrder {
  id: string
  orderNumber: string
  supplier: string
  status: 'draft' | 'sent' | 'received' | 'partial' | 'cancelled'
  date: string
  expectedDate?: string
  receivedDate?: string
  items: PurchaseOrderItem[]
  subtotal: number
  total: number
  notes?: string
}

export interface CustomerActivity {
  id: string
  customerId: string
  type: 'call' | 'email' | 'visit' | 'note' | 'whatsapp'
  date: string
  subject: string
  notes?: string
  done: boolean
  createdAt: string
}

export interface Quotation {
  id: string; quoteNumber: string; customer: string; customerId: string
  items: OrderItem[]
  subtotal: number; discount?: number; tax: number; total: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  validUntil: string; date: string
  deliveryEstimate?: string; notes?: string; internalNotes?: string
  convertedToOrderId?: string
  priceListId?: string
}

export interface Supplier {
  id: string
  name: string
  contactName: string
  email: string
  phone: string
  address: string
  city: string
  category: string
  notes: string
  isActive: boolean
  createdAt?: string
  leadTimeDays?: number    // typical days from order → delivery
  paymentTerms?: number    // credit days from receipt (Net-N)
  minOrderValue?: number   // minimum order in COP
}

export interface Payment {
  id: string
  saleOrderId: string
  saleOrderNumber: string
  customer: string
  customerId: string
  date: string
  amount: number
  method: string
  reference: string
  notes: string
  createdAt?: string
}

export interface InventoryMovement {
  id: string
  itemId: string
  itemName: string
  itemType: 'supply' | 'product'
  movementType: 'entry' | 'exit' | 'adjustment' | 'production' | 'return'
  quantity: number
  previousStock: number
  newStock: number
  unit: string
  reference: string
  notes: string
  createdBy: string
  createdAt: string
}

export interface Return {
  id: string
  returnNumber: string
  saleOrderId: string
  saleOrderNumber: string
  customer: string
  customerId: string
  date: string
  reason: string
  status: 'pending' | 'approved' | 'refunded' | 'rejected'
  items: { product: string; productId?: string; qty: number; price: number; subtotal: number }[]
  subtotal: number
  tax: number
  total: number
  creditNoteNumber: string
  refundMethod: string
  notes: string
  createdAt?: string
}

// ── Supplies ────────────────────────────────
export const supplies: Supply[] = [
  { id:'s1',  sku:'INS-001', name:'Cemento gris Portland',   category:'Cementos',    unit:'kg',  stock:120, minStock:50,  cost:0.85, supplier:'Cemex Colombia' },
  { id:'s2',  sku:'INS-002', name:'Cemento blanco',          category:'Cementos',    unit:'kg',  stock:60,  minStock:25,  cost:1.40, supplier:'Cemex Colombia' },
  { id:'s3',  sku:'INS-003', name:'Arena fina de río',       category:'Agregados',   unit:'kg',  stock:200, minStock:80,  cost:0.18, supplier:'Áridos del Llano' },
  { id:'s4',  sku:'INS-004', name:'Fibra de vidrio AR',      category:'Refuerzos',   unit:'kg',  stock:15,  minStock:5,   cost:12.50,supplier:'FibraPlast SAS' },
  { id:'s5',  sku:'INS-005', name:'Pigmento negro óxido',    category:'Pigmentos',   unit:'kg',  stock:8,   minStock:3,   cost:9.80, supplier:'ColorConcrete' },
  { id:'s6',  sku:'INS-006', name:'Pigmento blanco titanio', category:'Pigmentos',   unit:'kg',  stock:6,   minStock:2,   cost:11.20,supplier:'ColorConcrete' },
  { id:'s7',  sku:'INS-007', name:'Pigmento terracota',      category:'Pigmentos',   unit:'kg',  stock:4,   minStock:2,   cost:10.50,supplier:'ColorConcrete' },
  { id:'s8',  sku:'INS-008', name:'Pigmento verde musgo',    category:'Pigmentos',   unit:'kg',  stock:3,   minStock:2,   cost:10.50,supplier:'ColorConcrete' },
  { id:'s9',  sku:'INS-009', name:'Desmoldante en spray',    category:'Auxiliares',  unit:'u',   stock:12,  minStock:4,   cost:8.90, supplier:'MoldPro' },
  { id:'s10', sku:'INS-010', name:'Resina selladora mate',   category:'Acabados',    unit:'L',   stock:10,  minStock:3,   cost:18.00,supplier:'SealTech' },
  { id:'s11', sku:'INS-011', name:'Lija grano 120',          category:'Acabados',    unit:'u',   stock:50,  minStock:20,  cost:0.90, supplier:'Abrasivos Nacionales' },
  { id:'s12', sku:'INS-012', name:'Lija grano 400',          category:'Acabados',    unit:'u',   stock:40,  minStock:15,  cost:1.20, supplier:'Abrasivos Nacionales' },
  { id:'s13', sku:'INS-013', name:'Tierra negra abonada',    category:'Sustratos',   unit:'kg',  stock:80,  minStock:30,  cost:0.65, supplier:'AgroVerde' },
  { id:'s14', sku:'INS-014', name:'Perlita agrícola',        category:'Sustratos',   unit:'kg',  stock:25,  minStock:10,  cost:2.80, supplier:'AgroVerde' },
  { id:'s15', sku:'INS-015', name:'Musgo sphagnum',          category:'Sustratos',   unit:'kg',  stock:10,  minStock:4,   cost:6.50, supplier:'BioMoss' },
]

// ── Products ─────────────────────────────────
export const products: Product[] = [
  { id:'p1',  sku:'PRD-001', name:'Maceta Redonda S',        category:'Macetas',     unit:'u',  stock:28, price:35000,  cost:9800,  isActive:true,  recipeId:'r1', description:'Maceta redonda en concreto pigmentado. Diámetro 12 cm. Perfecta para suculentas.',
    variants: [
      { id:'v1-1', sku:'PRD-001-NAT', attributes:{ color:'Natural',   acabado:'Sellado mate'     }, stock:10, isActive:true },
      { id:'v1-2', sku:'PRD-001-NEG', attributes:{ color:'Negro',     acabado:'Sellado mate'     }, priceOverride:38000, stock:8,  isActive:true },
      { id:'v1-3', sku:'PRD-001-TER', attributes:{ color:'Terracota', acabado:'Sellado mate'     }, priceOverride:38000, stock:6,  isActive:true },
      { id:'v1-4', sku:'PRD-001-BLA', attributes:{ color:'Blanco',    acabado:'Sin sellar'       }, priceOverride:40000, stock:4,  isActive:true },
    ] },
  { id:'p2',  sku:'PRD-002', name:'Maceta Redonda M',        category:'Macetas',     unit:'u',  stock:20, price:55000,  cost:14500, isActive:true,  recipeId:'r1', description:'Maceta redonda mediana en concreto. Diámetro 18 cm. Acabado liso sellado.' },
  { id:'p3',  sku:'PRD-003', name:'Maceta Redonda L',        category:'Macetas',     unit:'u',  stock:12, price:85000,  cost:22000, isActive:true,  recipeId:'r3', description:'Maceta redonda grande. Diámetro 25 cm. Ideal para plantas de interior.' },
  { id:'p4',  sku:'PRD-004', name:'Bandeja Rectangular',     category:'Bandejas',    unit:'u',  stock:15, price:68000,  cost:18500, isActive:true,  recipeId:'r2', description:'Bandeja rectangular para composiciones. 30×15 cm. Concreto natural con fibra.' },
  { id:'p5',  sku:'PRD-005', name:'Jarrón Cónico',           category:'Jarrones',    unit:'u',  stock:10, price:95000,  cost:26000, isActive:true,  recipeId:'r3', description:'Jarrón cónico de alto impacto. Alto 30 cm. Acabado pigmentado negro mate.',
    variants: [
      { id:'v5-1', sku:'PRD-005-NAT', attributes:{ color:'Natural', acabado:'Sellado mate'  }, stock:4,  isActive:true },
      { id:'v5-2', sku:'PRD-005-NEG', attributes:{ color:'Negro',   acabado:'Sellado mate'  }, priceOverride:105000, stock:6, isActive:true },
      { id:'v5-3', sku:'PRD-005-BLA', attributes:{ color:'Blanco',  acabado:'Sellado brillante' }, priceOverride:108000, stock:2, isActive:true },
    ] },
  { id:'p6',  sku:'PRD-006', name:'Portavelas Set x3',       category:'Decoración',  unit:'set',stock:22, price:48000,  cost:12000, isActive:true,  recipeId:'r1', description:'Set de 3 portavelas en concreto. Alturas 5-8-12 cm. Diseño minimalista.' },
  { id:'p7',  sku:'PRD-007', name:'Macetero Hexagonal',      category:'Macetas',     unit:'u',  stock:8,  price:72000,  cost:19800, isActive:true,  recipeId:'r2', description:'Macetero hexagonal moderno. 20×20 cm. Concreto blanco con sellador UV.' },
  { id:'p8',  sku:'PRD-008', name:'Suculenta Haworthia',     category:'Suculentas',  unit:'u',  stock:35, price:18000,  cost:4500,  isActive:true,  description:'Haworthia fasciata en maceta de 8 cm. Lista para regalo o decoración.' },
  { id:'p9',  sku:'PRD-009', name:'Suculenta Echeveria',     category:'Suculentas',  unit:'u',  stock:42, price:16000,  cost:3800,  isActive:true,  description:'Echeveria elegans en maceta de concreto S. Colores variados.' },
  { id:'p10', sku:'PRD-010', name:'Cactus Variado',          category:'Suculentas',  unit:'u',  stock:28, price:22000,  cost:5200,  isActive:true,  description:'Cactus de colección en maceta de concreto. Variedad aleatoria.' },
  { id:'p11', sku:'PRD-011', name:'Kit Inicio Concreto',     category:'Decoración',  unit:'kit',stock:5,  price:180000, cost:58000, isActive:true,  description:'Kit decorativo: bandeja + 2 macetas S + suculenta. Perfecto como regalo.' },
]

// ── Recipes (Fórmulas de mezcla) ──────────────
export const recipes: Recipe[] = [
  {
    id:'r1', name:'Fórmula Estándar (piezas pequeñas)', productId:'p1',
    yieldQty:1, yieldUnit:'u',
    ingredients:[
      { supplyId:'s1', supplyName:'Cemento gris Portland', qty:0.50, unit:'kg', cost:0.43 },
      { supplyId:'s3', supplyName:'Arena fina de río',     qty:0.40, unit:'kg', cost:0.07 },
      { supplyId:'s4', supplyName:'Fibra de vidrio AR',    qty:0.02, unit:'kg', cost:0.25 },
      { supplyId:'s9', supplyName:'Desmoldante en spray',  qty:0.05, unit:'u',  cost:0.45 },
      { supplyId:'s11',supplyName:'Lija grano 120',        qty:0.20, unit:'u',  cost:0.18 },
      { supplyId:'s10',supplyName:'Resina selladora mate', qty:0.05, unit:'L',  cost:0.90 },
    ],
    totalCost:2.28, costPerUnit:2.28,
  },
  {
    id:'r2', name:'Fórmula Pigmentada Negra', productId:'p4',
    yieldQty:1, yieldUnit:'u',
    ingredients:[
      { supplyId:'s1', supplyName:'Cemento gris Portland', qty:0.80, unit:'kg', cost:0.68 },
      { supplyId:'s3', supplyName:'Arena fina de río',     qty:0.60, unit:'kg', cost:0.11 },
      { supplyId:'s4', supplyName:'Fibra de vidrio AR',    qty:0.03, unit:'kg', cost:0.38 },
      { supplyId:'s5', supplyName:'Pigmento negro óxido',  qty:0.04, unit:'kg', cost:0.39 },
      { supplyId:'s9', supplyName:'Desmoldante en spray',  qty:0.08, unit:'u',  cost:0.71 },
      { supplyId:'s12',supplyName:'Lija grano 400',        qty:0.30, unit:'u',  cost:0.36 },
      { supplyId:'s10',supplyName:'Resina selladora mate', qty:0.08, unit:'L',  cost:1.44 },
    ],
    totalCost:4.07, costPerUnit:4.07,
  },
  {
    id:'r3', name:'Fórmula Piezas Grandes', productId:'p3',
    yieldQty:1, yieldUnit:'u',
    ingredients:[
      { supplyId:'s1', supplyName:'Cemento gris Portland', qty:1.20, unit:'kg', cost:1.02 },
      { supplyId:'s2', supplyName:'Cemento blanco',        qty:0.30, unit:'kg', cost:0.42 },
      { supplyId:'s3', supplyName:'Arena fina de río',     qty:0.90, unit:'kg', cost:0.16 },
      { supplyId:'s4', supplyName:'Fibra de vidrio AR',    qty:0.05, unit:'kg', cost:0.63 },
      { supplyId:'s9', supplyName:'Desmoldante en spray',  qty:0.12, unit:'u',  cost:1.07 },
      { supplyId:'s11',supplyName:'Lija grano 120',        qty:0.50, unit:'u',  cost:0.45 },
      { supplyId:'s12',supplyName:'Lija grano 400',        qty:0.50, unit:'u',  cost:0.60 },
      { supplyId:'s10',supplyName:'Resina selladora mate', qty:0.12, unit:'L',  cost:2.16 },
    ],
    totalCost:6.51, costPerUnit:6.51,
  },
]

// ── Production Orders ─────────────────────────
export const productionOrders: ProductionOrder[] = [
  { id:'po1', orderNumber:'OP-2025-001', recipe:'Fórmula Estándar (piezas pequeñas)', product:'Maceta Redonda S',    recipeId:'r1', plannedQty:30, actualQty:30, status:'finished',    priority:2, plannedStart:'2025-02-03 08:00', plannedEnd:'2025-02-03 14:00', estimatedCost:68400,  actualCost:65200,  assignedTo:'Carlos Mendez' },
  { id:'po2', orderNumber:'OP-2025-002', recipe:'Fórmula Pigmentada Negra',           product:'Bandeja Rectangular', recipeId:'r2', plannedQty:15, actualQty:14, status:'finished',    priority:3, plannedStart:'2025-02-05 07:00', plannedEnd:'2025-02-05 12:00', estimatedCost:61050,  actualCost:58800,  assignedTo:'Laura Herrera' },
  { id:'po3', orderNumber:'OP-2025-003', recipe:'Fórmula Piezas Grandes',             product:'Jarrón Cónico',       recipeId:'r3', plannedQty:10, status:'in_progress', priority:1,  plannedStart:'2025-03-10 08:00', plannedEnd:'2025-03-10 16:00', estimatedCost:65100,  assignedTo:'Carlos Mendez' },
  { id:'po4', orderNumber:'OP-2025-004', recipe:'Fórmula Estándar (piezas pequeñas)', product:'Portavelas Set x3',   recipeId:'r1', plannedQty:25, status:'pending',     priority:2,  plannedStart:'2025-03-12 08:00', plannedEnd:'2025-03-12 15:00', estimatedCost:57000,  assignedTo:'Miguel Torres' },
  { id:'po5', orderNumber:'OP-2025-005', recipe:'Fórmula Piezas Grandes',             product:'Maceta Redonda L',    recipeId:'r3', plannedQty:12, status:'pending',     priority:3,  plannedStart:'2025-03-14 07:00', plannedEnd:'2025-03-14 13:00', estimatedCost:78120,  assignedTo:'Laura Herrera' },
]

// ── Customers ────────────────────────────────
export const customers: Customer[] = [
  { id:'c1', code:'CLI-001', name:'Daniela Morales',   company:'Studio Verde Interiorismo', email:'daniela@studioverde.co',  phone:'+57 310 1234567', city:'Bogotá',      segment:'vip',      totalPurchases:4850000, lastPurchase:'2025-03-07', isActive:true, notes:'Interiorista. Prefiere piezas en tonos neutros y blanco.' },
  { id:'c2', code:'CLI-002', name:'Felipe Guzmán',     company:'Vivero El Jardín',          email:'felipe@viveroejardin.com',phone:'+57 311 2345678', city:'Medellín',    segment:'mayorista',totalPurchases:9200000, lastPurchase:'2025-03-06', isActive:true, notes:'Compras al por mayor. Pedidos mínimos de 20 unidades.' },
  { id:'c3', code:'CLI-003', name:'Camila Ospina',     company:undefined,                   email:'camilao@gmail.com',       phone:'+57 312 3456789', city:'Cali',        segment:'regular',  totalPurchases:1200000, lastPurchase:'2025-02-28', isActive:true },
  { id:'c4', code:'CLI-004', name:'Boutique Terraverde',company:'Boutique Terraverde',       email:'compras@terraverde.co',   phone:'+57 313 4567890', city:'Bogotá',      segment:'mayorista',totalPurchases:6700000, lastPurchase:'2025-03-05', isActive:true, notes:'Tienda de diseño. Interesados en colecciones nuevas.' },
  { id:'c5', code:'CLI-005', name:'Valentina Cruz',    company:undefined,                   email:'vcruz@outlook.com',       phone:'+57 314 5678901', city:'Barranquilla',segment:'regular',  totalPurchases:850000,  lastPurchase:'2025-02-15', isActive:true },
  { id:'c6', code:'CLI-006', name:'Hotel Selva Real',  company:'Hotel Selva Real',          email:'decoracion@selvareal.com',phone:'+57 315 6789012', city:'Cartagena',   segment:'vip',      totalPurchases:3400000, lastPurchase:'2025-03-02', isActive:true, notes:'Hotel boutique. Pedidos estacionales para decoración de lobbies.' },
]

// ── Sales Orders ──────────────────────────────
export const saleOrders: SaleOrder[] = [
  { id:'so1', orderNumber:'VTA-2025-001', customer:'Daniela Morales',    customerId:'c1', items:[{product:'Maceta Redonda M',productId:'p2',qty:6,price:55000,subtotal:330000},{product:'Jarrón Cónico',productId:'p5',qty:2,price:95000,subtotal:190000}], subtotal:520000, tax:98800,  total:618800,  status:'delivered',   paymentStatus:'paid',    paymentMethod:'Transferencia', date:'2025-03-07', deliveryDate:'2025-03-07' },
  { id:'so2', orderNumber:'VTA-2025-002', customer:'Felipe Guzmán',      customerId:'c2', items:[{product:'Maceta Redonda S',productId:'p1',qty:20,price:35000,subtotal:700000},{product:'Portavelas Set x3',productId:'p6',qty:10,price:48000,subtotal:480000}], subtotal:1180000, tax:224200, total:1404200, status:'processing',  paymentStatus:'partial', paymentMethod:'Transferencia', date:'2025-03-07', deliveryDate:'2025-03-12' },
  { id:'so3', orderNumber:'VTA-2025-003', customer:'Camila Ospina',      customerId:'c3', items:[{product:'Suculenta Echeveria',productId:'p9',qty:3,price:16000,subtotal:48000},{product:'Maceta Redonda S',productId:'p1',qty:1,price:35000,subtotal:35000}], subtotal:83000, tax:15770, total:98770,   status:'confirmed',   paymentStatus:'paid',    paymentMethod:'Tarjeta',       date:'2025-03-06' },
  { id:'so4', orderNumber:'VTA-2025-004', customer:'Boutique Terraverde', customerId:'c4', items:[{product:'Bandeja Rectangular',productId:'p4',qty:8,price:68000,subtotal:544000},{product:'Macetero Hexagonal',productId:'p7',qty:5,price:72000,subtotal:360000}], subtotal:904000, tax:171760, total:1075760, status:'pending',     paymentStatus:'pending', paymentMethod:'Transferencia', date:'2025-03-08', deliveryDate:'2025-03-15' },
  { id:'so5', orderNumber:'VTA-2025-005', customer:'Hotel Selva Real',   customerId:'c6', items:[{product:'Jarrón Cónico',productId:'p5',qty:4,price:95000,subtotal:380000},{product:'Maceta Redonda L',productId:'p3',qty:3,price:85000,subtotal:255000}], subtotal:635000, tax:120650, total:755650,  status:'confirmed',   paymentStatus:'paid',    paymentMethod:'Transferencia', date:'2025-03-05', deliveryDate:'2025-03-10' },
  { id:'so6', orderNumber:'VTA-2025-006', customer:'Valentina Cruz',     customerId:'c5', items:[{product:'Kit Inicio Concreto',productId:'p11',qty:1,price:180000,subtotal:180000}], subtotal:180000, tax:34200, total:214200, status:'delivered',   paymentStatus:'paid',    paymentMethod:'Efectivo',      date:'2025-03-04' },
  { id:'so7', orderNumber:'VTA-2025-007', customer:'Daniela Morales',    customerId:'c1', items:[{product:'Portavelas Set x3',productId:'p6',qty:4,price:48000,subtotal:192000},{product:'Suculenta Haworthia',productId:'p8',qty:4,price:18000,subtotal:72000}], subtotal:264000, tax:50160, total:314160,  status:'delivered',   paymentStatus:'paid',    paymentMethod:'Tarjeta',       date:'2025-02-28', deliveryDate:'2025-02-28' },
  { id:'so8', orderNumber:'VTA-2025-008', customer:'Felipe Guzmán',      customerId:'c2', items:[{product:'Maceta Redonda M',productId:'p2',qty:12,price:55000,subtotal:660000},{product:'Maceta Redonda S — Negro / Sellado mate',productId:'p1',variantId:'v1-2',qty:15,price:38000,subtotal:570000}], subtotal:1230000, tax:233700, total:1463700, status:'delivered',   paymentStatus:'paid',    paymentMethod:'Transferencia', date:'2025-02-20', deliveryDate:'2025-02-22' },
]

// ── Quotations ────────────────────────────────
export const quotations: Quotation[] = [
  {
    id:'q1', quoteNumber:'COT-2025-001', customer:'Daniela Morales', customerId:'c1',
    items:[
      {product:'Maceta Redonda M',productId:'p2',qty:10,price:55000,subtotal:550000},
      {product:'Jarrón Cónico — Negro / Sellado mate',productId:'p5',variantId:'v5-2',qty:3,price:105000,subtotal:315000},
    ],
    subtotal:865000, tax:164350, total:1029350,
    status:'sent', validUntil:'2025-03-25', date:'2025-03-10',
    deliveryEstimate:'15 días hábiles',
    notes:'Incluye empaque especial para envío. Colores según muestra enviada por correo.',
    internalNotes:'Cliente prefiere entrega los viernes. Confirmar disponibilidad.',
  },
  {
    id:'q2', quoteNumber:'COT-2025-002', customer:'Boutique Terraverde', customerId:'c4',
    items:[
      {product:'Maceta Redonda S — Terracota / Sellado mate',productId:'p1',variantId:'v1-3',qty:20,price:38000,subtotal:760000},
      {product:'Portavelas Set x3',productId:'p6',qty:8,price:48000,subtotal:384000},
    ],
    subtotal:1144000, tax:217360, total:1361360,
    status:'accepted', validUntil:'2025-03-20', date:'2025-03-05',
    deliveryEstimate:'20 días hábiles',
    notes:'Pedido para nueva colección primavera. Confirmado por WhatsApp.',
  },
  {
    id:'q3', quoteNumber:'COT-2025-003', customer:'Hotel Selva Real', customerId:'c6',
    items:[
      {product:'Jarrón Cónico — Blanco / Sellado brillante',productId:'p5',variantId:'v5-3',qty:6,price:108000,subtotal:648000},
      {product:'Maceta Redonda L',productId:'p3',qty:6,price:85000,subtotal:510000},
      {product:'Bandeja Rectangular',productId:'p4',qty:4,price:68000,subtotal:272000},
    ],
    subtotal:1430000, tax:271700, total:1701700,
    status:'draft', validUntil:'2025-03-30', date:'2025-03-12',
    deliveryEstimate:'30 días hábiles',
    internalNotes:'Pendiente confirmar medidas exactas con la decoradora del hotel.',
  },
  {
    id:'q4', quoteNumber:'COT-2025-004', customer:'Camila Ospina', customerId:'c3',
    items:[
      {product:'Kit Inicio Concreto',productId:'p11',qty:2,price:180000,subtotal:360000},
      {product:'Suculenta Haworthia',productId:'p8',qty:3,price:18000,subtotal:54000},
    ],
    subtotal:414000, tax:78660, total:492660,
    status:'rejected', validUntil:'2025-03-08', date:'2025-02-25',
    notes:'Cliente solicitó descuento mayor al 20%, no fue posible aplicar.',
  },
]

// ── Purchase Orders ───────────────────────────
export const purchaseOrders: PurchaseOrder[] = [
  {
    id:'oc1', orderNumber:'OC-2025-001', supplier:'Cemex Colombia', status:'received',
    date:'2025-02-01', expectedDate:'2025-02-08', receivedDate:'2025-02-07',
    items:[
      { supplyId:'s1', supplyName:'Cemento gris Portland', unit:'kg', qty:100, unitCost:850,  subtotal:85000 },
      { supplyId:'s2', supplyName:'Cemento blanco',        unit:'kg', qty:50,  unitCost:1400, subtotal:70000 },
    ],
    subtotal:155000, total:155000, notes:'Pedido mensual de cementos.',
  },
  {
    id:'oc2', orderNumber:'OC-2025-002', supplier:'ColorConcrete', status:'sent',
    date:'2025-03-05', expectedDate:'2025-03-12',
    items:[
      { supplyId:'s5', supplyName:'Pigmento negro óxido',    unit:'kg', qty:10, unitCost:9800,  subtotal:98000 },
      { supplyId:'s6', supplyName:'Pigmento blanco titanio', unit:'kg', qty:8,  unitCost:11200, subtotal:89600 },
      { supplyId:'s7', supplyName:'Pigmento terracota',      unit:'kg', qty:6,  unitCost:10500, subtotal:63000 },
    ],
    subtotal:250600, total:250600,
  },
  {
    id:'oc3', orderNumber:'OC-2025-003', supplier:'FibraPlast SAS', status:'draft',
    date:'2025-03-10',
    items:[
      { supplyId:'s4', supplyName:'Fibra de vidrio AR', unit:'kg', qty:20, unitCost:12500, subtotal:250000 },
    ],
    subtotal:250000, total:250000, notes:'Pendiente confirmar precio con el proveedor.',
  },
  {
    id:'oc4', orderNumber:'OC-2025-004', supplier:'AgroVerde', status:'partial',
    date:'2025-03-01', expectedDate:'2025-03-08', receivedDate:'2025-03-07',
    items:[
      { supplyId:'s13', supplyName:'Tierra negra abonada', unit:'kg', qty:100, unitCost:650,  subtotal:65000,  receivedQty:60 },
      { supplyId:'s14', supplyName:'Perlita agrícola',     unit:'kg', qty:30,  unitCost:2800, subtotal:84000,  receivedQty:30 },
    ],
    subtotal:149000, total:149000, notes:'Pendiente 40 kg tierra negra.',
  },
]

// ── Customer Activities ───────────────────────
export const customerActivities: CustomerActivity[] = [
  { id:'a1', customerId:'c1', type:'call',     date:'2025-03-10', subject:'Confirmar colores cotización COT-2025-001',       notes:'Prefiere el jarrón en negro mate. Confirmar plazo de entrega.', done:false, createdAt:'2025-03-10T10:30:00' },
  { id:'a2', customerId:'c1', type:'email',    date:'2025-03-08', subject:'Envío cotización COT-2025-001',                    notes:'Cotización enviada por correo y WhatsApp.',                      done:true,  createdAt:'2025-03-08T09:15:00' },
  { id:'a3', customerId:'c2', type:'whatsapp', date:'2025-03-07', subject:'Seguimiento pedido VTA-2025-002',                  notes:'Confirmar fecha entrega. Pendiente pago saldo.',                done:false, createdAt:'2025-03-07T14:00:00' },
  { id:'a4', customerId:'c4', type:'visit',    date:'2025-03-04', subject:'Presentación colección primavera',                 notes:'Mostramos muestras nuevas. Interés en 3 referencias nuevas.',   done:true,  createdAt:'2025-03-04T11:00:00' },
  { id:'a5', customerId:'c6', type:'note',     date:'2025-03-12', subject:'Confirmar medidas con decoradora del hotel',       notes:'La decoradora revisará dimensiones antes del viernes.',         done:false, createdAt:'2025-03-12T08:30:00' },
  { id:'a6', customerId:'c5', type:'call',     date:'2025-03-01', subject:'Reactivar cliente — sin compras recientes',        notes:'Sin respuesta. Reintentar en 2 semanas.',                       done:true,  createdAt:'2025-03-01T16:00:00' },
]

// ── Sales chart data (last 30 days) ───────────
export const salesChartData = [
  {day:'11/02',ventas:480000, meta:600000},{day:'12/02',ventas:620000,meta:600000},{day:'13/02',ventas:390000,meta:600000},
  {day:'14/02',ventas:710000,meta:600000},{day:'15/02',ventas:850000,meta:600000},{day:'16/02',ventas:920000,meta:600000},
  {day:'17/02',ventas:680000,meta:600000},{day:'18/02',ventas:540000,meta:600000},{day:'19/02',ventas:760000,meta:600000},
  {day:'20/02',ventas:1410150,meta:600000},{day:'21/02',ventas:980000,meta:600000},{day:'22/02',ventas:780000,meta:600000},
  {day:'23/02',ventas:640000,meta:600000},{day:'24/02',ventas:550000,meta:600000},{day:'25/02',ventas:920000,meta:600000},
  {day:'26/02',ventas:1100000,meta:600000},{day:'27/02',ventas:980000,meta:600000},{day:'28/02',ventas:314160,meta:600000},
  {day:'01/03',ventas:740000,meta:600000},{day:'02/03',ventas:660000,meta:600000},{day:'03/03',ventas:810000,meta:600000},
  {day:'04/03',ventas:214200,meta:600000},{day:'05/03',ventas:755650,meta:600000},{day:'06/03',ventas:98770,meta:600000},
  {day:'07/03',ventas:2023000,meta:600000},{day:'08/03',ventas:1075760,meta:600000},{day:'09/03',ventas:620000,meta:600000},
  {day:'10/03',ventas:890000,meta:600000},{day:'11/03',ventas:740000,meta:600000},{day:'12/03',ventas:0,meta:600000},
]

export const topProductsData = [
  { name:'Maceta Redonda S', ventas:36 },
  { name:'Maceta Redonda M', ventas:18 },
  { name:'Portavelas Set',   ventas:14 },
  { name:'Jarrón Cónico',    ventas:6  },
  { name:'Suculentas',       ventas:7  },
]

export const productionByMonth = [
  {month:'Oct', unidades:68},{month:'Nov', unidades:85},{month:'Dic', unidades:72},
  {month:'Ene', unidades:96},{month:'Feb', unidades:110},{month:'Mar', unidades:45},
]

export const revenueByCategory = [
  {name:'Macetas',    value:42},{name:'Bandejas', value:18},
  {name:'Jarrones',   value:20},{name:'Decoración',value:12},{name:'Suculentas',value:8},
]
