import { useState, useRef } from 'react'
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { read, utils } from 'xlsx'

type Entity = 'supplies' | 'products' | 'customers'

interface Props {
  entity: Entity
  onClose: () => void
  onSuccess: () => void
}

const ENTITY_LABELS: Record<Entity, string> = {
  supplies: 'Insumos',
  products: 'Productos',
  customers: 'Clientes',
}

const COLUMN_DEFS: Record<Entity, { key: string; label: string; required?: boolean }[]> = {
  supplies: [
    { key: 'name', label: 'Nombre', required: true },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Categoría' },
    { key: 'unit', label: 'Unidad' },
    { key: 'stock', label: 'Stock' },
    { key: 'minStock', label: 'Stock mínimo' },
    { key: 'cost', label: 'Costo' },
    { key: 'supplier', label: 'Proveedor' },
  ],
  products: [
    { key: 'name', label: 'Nombre', required: true },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Categoría' },
    { key: 'unit', label: 'Unidad' },
    { key: 'price', label: 'Precio' },
    { key: 'cost', label: 'Costo' },
    { key: 'stock', label: 'Stock' },
    { key: 'description', label: 'Descripción' },
    { key: 'isActive', label: 'Activo' },
  ],
  customers: [
    { key: 'name', label: 'Nombre', required: true },
    { key: 'code', label: 'Código' },
    { key: 'company', label: 'Empresa' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'city', label: 'Ciudad' },
    { key: 'segment', label: 'Segmento' },
    { key: 'notes', label: 'Notas' },
  ],
}

// Known aliases for auto-detect column mapping
const KNOWN_ALIASES: Record<string, string> = {
  nombre: 'name', insumo: 'name', producto: 'name', cliente: 'name',
  name: 'name',
  sku: 'sku', código: 'sku', codigo: 'sku', code: 'code',
  category: 'category', categoría: 'category', categoria: 'category',
  unit: 'unit', unidad: 'unit',
  stock: 'stock', cantidad: 'stock', qty: 'stock',
  minstock: 'minStock', min_stock: 'minStock', stock_minimo: 'minStock',
  mínimo: 'minStock', minimo: 'minStock',
  cost: 'cost', costo: 'cost', precio_costo: 'cost',
  price: 'price', precio: 'price', precio_venta: 'price',
  supplier: 'supplier', proveedor: 'supplier',
  description: 'description', descripción: 'description', descripcion: 'description',
  isactive: 'isActive', is_active: 'isActive', activo: 'isActive', active: 'isActive',
  company: 'company', empresa: 'company',
  email: 'email', correo: 'email',
  phone: 'phone', teléfono: 'phone', telefono: 'phone', celular: 'phone',
  city: 'city', ciudad: 'city',
  segment: 'segment', segmento: 'segment',
  notes: 'notes', notas: 'notes', observaciones: 'notes',
}

function getUserHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem('erp_auth')
    if (!raw) return {}
    const user = JSON.parse(raw)
    return user.token ? { 'Authorization': `Bearer ${user.token}` } : {}
  } catch { return {} }
}

export default function ImportModal({ entity, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [fileName, setFileName] = useState('')

  const entityCols = COLUMN_DEFS[entity]

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const workbook = read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
      if (json.length === 0) return

      const hdrs = Object.keys(json[0])
      setHeaders(hdrs)
      setRows(json)

      // Auto-detect column mapping
      const autoMap: Record<string, string> = {}
      for (const h of hdrs) {
        const normalized = h.toLowerCase().trim()
        const mapped = KNOWN_ALIASES[normalized]
        if (mapped && entityCols.some(c => c.key === mapped) && !Object.values(autoMap).includes(h)) {
          autoMap[mapped] = h
        }
      }
      setColumnMap(autoMap)
      setStep('preview')
    }
    reader.readAsArrayBuffer(file)
  }

  // ── Download template ──────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const hdrs = entityCols.map(c => c.key)
    const csvContent = hdrs.join(',') + '\n'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantilla_${entity}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    setLoading(true)
    try {
      // Remap rows using column mapping
      const mappedRows = rows.map(row => {
        const mapped: Record<string, any> = {}
        for (const [field, sourceCol] of Object.entries(columnMap)) {
          if (sourceCol && row[sourceCol] !== undefined) {
            mapped[field] = row[sourceCol]
          }
        }
        return mapped
      })

      const res = await fetch(`/api/import/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getUserHeader() },
        body: JSON.stringify({ rows: mappedRows }),
      })
      const data = await res.json()
      setResult(data)
      setStep('result')
      if (data.imported > 0) {
        onSuccess()
      }
    } catch (err: any) {
      setResult({ imported: 0, errors: [err.message || 'Error de conexión'] })
      setStep('result')
    } finally {
      setLoading(false)
    }
  }

  // ── Preview data with mapped columns ───────────────────────────────────────

  const previewRows = rows.slice(0, 5)
  const mappedFields = Object.keys(columnMap).filter(k => columnMap[k])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl animate-fadeIn max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex-shrink-0">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Upload size={18} />
            Importar {ENTITY_LABELS[entity]}
          </h3>
          <button onClick={onClose}>
            <X size={18} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {/* ── Step: Upload ──────────────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div
                className="border-2 border-dashed border-slate-200 dark:border-gray-600 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <FileSpreadsheet size={40} className="mx-auto mb-3 text-slate-300 dark:text-gray-500" />
                <p className="text-sm font-medium text-slate-600 dark:text-gray-300">
                  Haz clic para seleccionar un archivo
                </p>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                  Formatos aceptados: .csv, .xlsx, .xls
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFile}
              />

              <div className="flex items-center justify-center">
                <button
                  className="btn btn-secondary flex items-center gap-2 text-sm"
                  onClick={downloadTemplate}
                >
                  <Download size={14} /> Descargar plantilla CSV
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 mb-2">
                  Columnas esperadas para {ENTITY_LABELS[entity]}:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entityCols.map(c => (
                    <span
                      key={c.key}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.required
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'bg-slate-200 dark:bg-gray-600 text-slate-600 dark:text-gray-300'
                      }`}
                    >
                      {c.key}{c.required ? ' *' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step: Preview ─────────────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-gray-300">
                  <span className="font-semibold">{fileName}</span> — {rows.length} filas detectadas
                </p>
                <button
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={() => { setStep('upload'); setRows([]); setHeaders([]); setColumnMap({}) }}
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Column mapping */}
              <div className="bg-slate-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 mb-3">
                  Mapeo de columnas
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {entityCols.map(col => (
                    <div key={col.key} className="flex items-center gap-2">
                      <label className="text-xs text-slate-500 dark:text-gray-400 w-24 flex-shrink-0">
                        {col.label}{col.required ? ' *' : ''}
                      </label>
                      <select
                        className="input text-xs py-1.5 flex-1"
                        value={columnMap[col.key] || ''}
                        onChange={(e) => setColumnMap({ ...columnMap, [col.key]: e.target.value })}
                      >
                        <option value="">— No mapear —</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              {mappedFields.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-2">
                    Vista previa (primeras {Math.min(5, rows.length)} filas)
                  </p>
                  <table className="w-full text-xs border border-slate-200 dark:border-gray-600 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-gray-700">
                        {mappedFields.map(f => (
                          <th key={f} className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-gray-300">
                            {entityCols.find(c => c.key === f)?.label || f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-gray-700">
                          {mappedFields.map(f => (
                            <td key={f} className="px-3 py-2 text-slate-700 dark:text-gray-300 max-w-[200px] truncate">
                              {String(row[columnMap[f]] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!columnMap['name'] && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  La columna "Nombre" es requerida. Asegúrate de mapearla.
                </p>
              )}
            </div>
          )}

          {/* ── Step: Result ──────────────────────────────────────────────── */}
          {step === 'result' && result && (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 p-4 rounded-lg ${
                result.imported > 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                {result.imported > 0 ? (
                  <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle size={24} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    {result.imported} {ENTITY_LABELS[entity].toLowerCase()} importados exitosamente
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      {result.errors.length} error(es) encontrado(s)
                    </p>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">Errores:</p>
                  <ul className="space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600 dark:text-red-400">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-gray-700 flex-shrink-0">
          {step === 'result' ? (
            <button className="btn btn-primary flex-1" onClick={onClose}>
              Cerrar
            </button>
          ) : (
            <>
              <button className="btn btn-secondary flex-1" onClick={onClose}>
                Cancelar
              </button>
              {step === 'preview' && (
                <button
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  onClick={handleImport}
                  disabled={loading || !columnMap['name']}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Importando...
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Importar {rows.length} filas
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
