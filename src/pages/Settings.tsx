import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CreditCard, Percent, Building, Bell, Shield, Save, Upload, X, Image, RotateCcw, AlertTriangle, ClipboardList, Search, RefreshCw, Plus, Pencil, Trash2, Eye, EyeOff, MessageCircle, Tag, BookOpen } from 'lucide-react'
import { useStore } from '../store/useStore'
import { UserAvatar } from '../components/layout/Topbar'
import Pagination from '../components/Pagination'
import UserManual from '../components/UserManual'
import { WA_TEMPLATES, WaTemplateKey } from '../utils/whatsapp'

const TAB_ICONS: Record<string, any> = {
  empresa: Building, usuarios: Users, pagos: CreditCard, precios: Tag,
  impuestos: Percent, notificaciones: Bell, whatsapp: MessageCircle, seguridad: Shield, auditoria: ClipboardList, manual: BookOpen,
}

const tabs = ['empresa','usuarios','pagos','precios','impuestos','notificaciones','whatsapp','seguridad','auditoria','manual']
const TAB_LABELS: Record<string, string> = {
  empresa:'Empresa', usuarios:'Usuarios y roles', pagos:'Métodos de pago', precios:'Listas de precios',
  impuestos:'Impuestos', notificaciones:'Notificaciones', whatsapp:'WhatsApp', seguridad:'Seguridad', auditoria:'Auditoría', manual:'Manual de usuario',
}

interface AuditEntry {
  id: number
  userName: string
  userEmail: string
  action: string
  entity: string
  entityId: string | null
  entityName: string | null
  details: string | null
  createdAt: string
}

const ACTION_BADGE: Record<string, string> = {
  crear:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  editar:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  eliminar:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  restablecer:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

interface AppUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt?: string
}

const ROLE_OPTIONS = ['Administrador','Producción','Ventas','Inventario','Contabilidad']

const ROLE_COLOR: Record<string, string> = {
  Administrador: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Producción:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Ventas:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Inventario:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Contabilidad:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'Ventas', isActive: true }

function getAuthHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem('erp_auth')
    if (!raw) return {}
    const user = JSON.parse(raw)
    return user.token ? { 'Authorization': `Bearer ${user.token}` } : {}
  } catch { return {} }
}

export default function Settings() {
  const [activeTab, setActiveTab]       = useState('empresa')
  const [saved, setSaved]               = useState(false)
  const [saving, setSaving]             = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting]       = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [auditLog, setAuditLog]         = useState<AuditEntry[]>([])
  const [auditSearch, setAuditSearch]   = useState('')
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditPage, setAuditPage]       = useState(1)
  const AUDIT_PAGE_SIZE = 25
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // ── Users state ─────────────────────────────────────────────────────────────
  const [users, setUsers]               = useState<AppUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userModal, setUserModal]       = useState<'add' | 'edit' | null>(null)
  const [editingUser, setEditingUser]   = useState<AppUser | null>(null)
  const [userForm, setUserForm]         = useState({ ...EMPTY_FORM })
  const [showFormPwd, setShowFormPwd]   = useState(false)
  const [userSaving, setUserSaving]     = useState(false)
  const [userError, setUserError]       = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const filteredAudit = auditLog.filter((e) => {
    const q = auditSearch.toLowerCase()
    return !q || e.userName.toLowerCase().includes(q) ||
      e.userEmail.toLowerCase().includes(q) ||
      e.entity.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      (e.entityName ?? '').toLowerCase().includes(q)
  })
  const paginatedAudit = filteredAudit.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE)

  const loadAudit = async () => {
    setAuditLoading(true)
    try {
      const data = await fetch('/api/audit?limit=200', { headers: getAuthHeader() }).then((r) => r.json())
      setAuditLog(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally {
      setAuditLoading(false)
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const data = await fetch('/api/users', { headers: getAuthHeader() }).then((r) => r.json())
      setUsers(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally {
      setUsersLoading(false)
    }
  }

  const openAddUser = () => {
    setUserForm({ ...EMPTY_FORM })
    setUserError('')
    setShowFormPwd(false)
    setEditingUser(null)
    setUserModal('add')
  }

  const openEditUser = (u: AppUser) => {
    setUserForm({ name: u.name, email: u.email, password: '', role: u.role, isActive: u.isActive })
    setUserError('')
    setShowFormPwd(false)
    setEditingUser(u)
    setUserModal('edit')
  }

  const closeUserModal = () => { setUserModal(null); setEditingUser(null) }

  const getUserHeader = getAuthHeader

  const handleSaveUser = async () => {
    if (!userForm.name.trim() || !userForm.email.trim()) {
      setUserError('Nombre y correo son obligatorios')
      return
    }
    if (userModal === 'add' && !userForm.password.trim()) {
      setUserError('La contraseña es obligatoria para nuevos usuarios')
      return
    }
    setUserSaving(true)
    setUserError('')
    try {
      const headers = { 'Content-Type': 'application/json', ...getUserHeader() }
      if (userModal === 'add') {
        const id = 'u' + Date.now()
        const res = await fetch('/api/users', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...userForm, id }),
        })
        const data = await res.json()
        if (!res.ok) { setUserError(data.error ?? 'Error al crear usuario'); return }
        setUsers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      } else if (userModal === 'edit' && editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(userForm),
        })
        const data = await res.json()
        if (!res.ok) { setUserError(data.error ?? 'Error al guardar'); return }
        setUsers((prev) => prev.map((u) => u.id === editingUser.id ? data : u))
      }
      closeUserModal()
    } catch { setUserError('Error de conexión con el servidor')
    } finally { setUserSaving(false) }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { ...getUserHeader() },
      })
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch { /* ignore */ } finally { setDeleting(false) }
  }

  useEffect(() => {
    if (activeTab === 'auditoria') loadAudit()
    if (activeTab === 'usuarios')  loadUsers()
  }, [activeTab])

  const { companySettings, saveCompanySettings, factoryReset, priceLists, addPriceList, updatePriceList, deletePriceList } = useStore()
  const [plModal, setPlModal] = useState<'add' | 'edit' | null>(null)
  const [editingPL, setEditingPL] = useState<{id:string;name:string;discountPercent:number;isActive:boolean} | null>(null)
  const [plForm, setPlForm] = useState({ name: '', discountPercent: 0, isActive: true })
  const [plDelTarget, setPlDelTarget] = useState<string | null>(null)

  const handleFactoryReset = async () => {
    if (resetConfirmText !== 'RESTABLECER') return
    setResetting(true)
    try {
      await factoryReset()
      navigate('/login', { replace: true })
    } catch {
      alert('Error al restablecer. Verifica que el servidor esté corriendo.')
      setResetting(false)
    }
  }

  const [company, setCompany] = useState({
    name:              companySettings.companyName,
    slogan:            companySettings.slogan,
    email:             companySettings.email,
    phone:             companySettings.phone,
    address:           companySettings.address,
    currency:          companySettings.currency,
    timezone:          companySettings.timezone,
    bankName:          companySettings.bankName,
    bankKey:           companySettings.bankKey,
    bankAccountType:   companySettings.bankAccountType,
    bankAccountNumber: companySettings.bankAccountNumber,
    bankMessage:       companySettings.bankMessage,
    tiktok:            companySettings.tiktok,
    whatsapp:          companySettings.whatsapp,
    instagram:         companySettings.instagram,
    instagramHandle:   companySettings.instagramHandle,
    smtpHost:          companySettings.smtpHost,
    smtpPort:          companySettings.smtpPort,
    smtpUser:          companySettings.smtpUser,
    smtpPass:          companySettings.smtpPass,
    smtpFrom:          companySettings.smtpFrom,
    resendApiKey:      companySettings.resendApiKey,
    invoicePrefix:     companySettings.invoicePrefix,
  })
  const [smtpTesting, setSmtpTesting]  = useState(false)
  const [smtpTestMsg, setSmtpTestMsg]  = useState<{ ok: boolean; text: string } | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(companySettings.logo)

  // Sync local state when store loads from API
  useEffect(() => {
    setCompany({
      name:              companySettings.companyName,
      slogan:            companySettings.slogan,
      email:             companySettings.email,
      phone:             companySettings.phone,
      address:           companySettings.address,
      currency:          companySettings.currency,
      timezone:          companySettings.timezone,
      bankName:          companySettings.bankName,
      bankKey:           companySettings.bankKey,
      bankAccountType:   companySettings.bankAccountType,
      bankAccountNumber: companySettings.bankAccountNumber,
      bankMessage:       companySettings.bankMessage,
      tiktok:            companySettings.tiktok,
      whatsapp:          companySettings.whatsapp,
      instagram:         companySettings.instagram,
      instagramHandle:   companySettings.instagramHandle,
      smtpHost:          companySettings.smtpHost,
      smtpPort:          companySettings.smtpPort,
      smtpUser:          companySettings.smtpUser,
      smtpPass:          companySettings.smtpPass,
      smtpFrom:          companySettings.smtpFrom,
      resendApiKey:      companySettings.resendApiKey,
      invoicePrefix:     companySettings.invoicePrefix,
    })
    setLogoPreview(companySettings.logo)
  }, [companySettings])

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('El logo debe ser menor a 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveCompanySettings({
        companyName:        company.name,
        slogan:             company.slogan,
        email:              company.email,
        phone:              company.phone,
        address:            company.address,
        currency:           company.currency,
        timezone:           company.timezone,
        logo:               logoPreview,
        bankName:           company.bankName,
        bankKey:            company.bankKey,
        bankAccountType:    company.bankAccountType,
        bankAccountNumber:  company.bankAccountNumber,
        bankMessage:        company.bankMessage,
        tiktok:             company.tiktok,
        whatsapp:           company.whatsapp,
        instagram:          company.instagram,
        instagramHandle:    company.instagramHandle,
        smtpHost:           company.smtpHost,
        smtpPort:           company.smtpPort,
        smtpUser:           company.smtpUser,
        smtpPass:           company.smtpPass,
        smtpFrom:           company.smtpFrom,
        resendApiKey:       company.resendApiKey,
        invoicePrefix:      company.invoicePrefix,
        monthlyGoal:        companySettings.monthlyGoal ?? 0,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      alert('Error al guardar. Verifica que el servidor esté corriendo.')
    } finally {
      setSaving(false)
    }
  }

  const [payMethods] = useState([
    { id:1, name:'Efectivo',        isActive:true  },
    { id:2, name:'Tarjeta débito',  isActive:true  },
    { id:3, name:'Tarjeta crédito', isActive:true  },
    { id:4, name:'Transferencia',   isActive:true  },
    { id:5, name:'Cheque',          isActive:false },
  ])

  const [taxes] = useState([
    { id:1, name:'IVA 16%', rate:16, isDefault:true,  isActive:true },
    { id:2, name:'IVA 0%',  rate:0,  isDefault:false, isActive:true },
    { id:3, name:'Exento',  rate:0,  isDefault:false, isActive:true },
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración</h1>
        <p className="text-slate-500 dark:text-gray-400 text-sm">Personalización del sistema</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-52 flex-shrink-0 space-y-1">
          {tabs.map((t) => {
            const Icon = TAB_ICONS[t]
            return (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                }`}>
                <Icon size={16} />{TAB_LABELS[t]}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 card p-6 animate-fadeIn">
          {activeTab === 'empresa' && (
            <div className="space-y-6">
              <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Building size={18} /> Datos de la empresa
              </h2>

              {/* ── Logo upload ── */}
              <div>
                <label className="label mb-2">Logo de la empresa</label>
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-gray-700 flex-shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Image size={32} className="text-slate-300 dark:text-gray-600" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <Upload size={15} /> Subir logo
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => { setLogoPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="btn flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                      >
                        <X size={15} /> Eliminar logo
                      </button>
                    )}
                    <p className="text-xs text-slate-400 dark:text-gray-500">PNG, JPG o SVG. Máx 2 MB.</p>
                  </div>
                </div>
              </div>

              {/* ── Fields ── */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Nombre de la empresa', 'name'],
                  ['Eslogan / descripción', 'slogan'],
                  ['Correo electrónico', 'email'],
                  ['Teléfono', 'phone'],
                  ['Dirección', 'address'],
                ].map(([label, key]) => (
                  <div key={key} className={key === 'address' ? 'col-span-2' : ''}>
                    <label className="label">{label}</label>
                    <input className="input" value={company[key as keyof typeof company]}
                      onChange={(e) => setCompany({ ...company, [key]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <label className="label">Moneda</label>
                  <select className="input" value={company.currency}
                    onChange={(e) => setCompany({ ...company, currency: e.target.value })}>
                    {['COP','USD','MXN','PEN','ARS','CLP'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Zona horaria</label>
                  <select className="input" value={company.timezone}
                    onChange={(e) => setCompany({ ...company, timezone: e.target.value })}>
                    {['America/Bogota','America/Mexico_City','America/Lima','America/Buenos_Aires'].map((tz) => (
                      <option key={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Prefijo de facturas</label>
                  <input className="input uppercase" maxLength={6}
                    placeholder="VTA"
                    value={company.invoicePrefix}
                    onChange={(e) => setCompany({ ...company, invoicePrefix: e.target.value.toUpperCase() })} />
                  <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                    Prefijo del número de factura. Ej: <code className="bg-slate-100 dark:bg-gray-700 px-1 rounded">FAC</code> → FAC-2026-0001
                  </p>
                </div>
              </div>

              {/* ── Bank / Factura info ── */}
              <div className="border-t border-slate-100 dark:border-gray-700 pt-5">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <CreditCard size={15} /> Datos de pago (Factura)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Banco (ej: Bancolombia)', 'bankName'],
                    ['Llave / Nequi / Teléfono', 'bankKey'],
                    ['Tipo de cuenta (ej: Cuenta Ahorros)', 'bankAccountType'],
                    ['Número de cuenta', 'bankAccountNumber'],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <input className="input" value={company[key as keyof typeof company] as string}
                        onChange={(e) => setCompany({ ...company, [key]: e.target.value })} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="label">Mensaje de agradecimiento (ej: Gracias por tu compra!!!)</label>
                    <input className="input" value={company.bankMessage}
                      onChange={(e) => setCompany({ ...company, bankMessage: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* ── Redes sociales ── */}
              <div className="border-t border-slate-100 dark:border-gray-700 pt-5">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-300 mb-4">
                  🌐 Redes sociales (Factura)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['TikTok URL', 'tiktok'],
                    ['WhatsApp (número)', 'whatsapp'],
                    ['Instagram URL', 'instagram'],
                    ['Instagram Handle (ej: @Amazoniaconcrete)', 'instagramHandle'],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <input className="input" value={company[key as keyof typeof company] as string}
                        onChange={(e) => setCompany({ ...company, [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Correo electrónico — SMTP (recomendado) + Resend (alternativa) ── */}
              <div className="border-t border-slate-100 dark:border-gray-700 pt-5">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-300 mb-1 flex items-center gap-2">
                  📧 Correo electrónico — envío de facturas
                </h3>
                <p className="text-xs text-slate-400 dark:text-gray-500 mb-3">
                  Configura tu servidor SMTP (recomendado) para enviar desde tu propio correo. Como alternativa puedes usar Resend.
                </p>

                {/* SMTP block */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">✉️ Servidor SMTP <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">(recomendado — gratis, envía desde tu correo real)</span></p>
                  </div>
                  <details className="mb-3">
                    <summary className="text-xs text-emerald-700 dark:text-emerald-400 cursor-pointer hover:underline">📘 Cómo configurar Gmail con "Contraseña de aplicación"</summary>
                    <ol className="mt-2 text-xs text-slate-600 dark:text-gray-300 space-y-1 list-decimal list-inside pl-2">
                      <li>Activa la verificación en 2 pasos en <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline text-blue-500">myaccount.google.com/security</a>.</li>
                      <li>Ve a <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline text-blue-500">myaccount.google.com/apppasswords</a> y genera una contraseña para "Correo".</li>
                      <li>Pega esa contraseña de 16 caracteres en el campo "Contraseña" de abajo (no tu contraseña normal).</li>
                      <li>Host: <code className="bg-white dark:bg-gray-800 px-1 rounded">smtp.gmail.com</code> · Puerto: <code className="bg-white dark:bg-gray-800 px-1 rounded">587</code> · Usuario: tu correo de Gmail.</li>
                    </ol>
                    <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">Para Outlook: <code className="bg-white dark:bg-gray-800 px-1 rounded">smtp-mail.outlook.com</code> puerto 587. Para otros proveedores busca "SMTP server settings".</p>
                  </details>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Servidor SMTP (host)</label>
                      <input className="input" placeholder="smtp.gmail.com" value={company.smtpHost}
                        onChange={(e) => setCompany({ ...company, smtpHost: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Puerto</label>
                      <input className="input" type="number" placeholder="587" value={company.smtpPort || 587}
                        onChange={(e) => setCompany({ ...company, smtpPort: parseInt(e.target.value || '587', 10) })} />
                    </div>
                    <div>
                      <label className="label">Usuario (tu correo)</label>
                      <input className="input" type="email" placeholder="tucorreo@gmail.com" value={company.smtpUser}
                        onChange={(e) => setCompany({ ...company, smtpUser: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Contraseña de aplicación</label>
                      <input className="input font-mono" type="password" placeholder="xxxx xxxx xxxx xxxx" value={company.smtpPass}
                        onChange={(e) => setCompany({ ...company, smtpPass: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Remitente <span className="font-normal text-slate-400">(opcional — por defecto se usa tu correo)</span></label>
                      <input className="input" placeholder="Amazonia Concrete <tucorreo@gmail.com>" value={company.smtpFrom}
                        onChange={(e) => setCompany({ ...company, smtpFrom: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Resend block */}
                <div className="p-4 bg-slate-50 dark:bg-gray-900/30 border border-slate-200 dark:border-gray-700 rounded-lg">
                  <p className="text-sm font-semibold text-slate-700 dark:text-gray-200 mb-2">🔄 Resend API <span className="text-xs font-normal text-slate-500">(alternativa / respaldo)</span></p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">
                    Crea una cuenta gratis en <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline text-blue-500">resend.com</a> →
                    <em> API Keys</em>. <strong>Importante:</strong> sin un dominio verificado en <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="underline">resend.com/domains</a>, Resend solo permite enviarte correos a ti mismo.
                  </p>
                  <label className="label">API Key de Resend</label>
                  <input className="input font-mono" placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx" value={company.resendApiKey}
                    onChange={(e) => setCompany({ ...company, resendApiKey: e.target.value })} />
                </div>

                {/* Test button */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={smtpTesting || (!company.smtpHost && !company.resendApiKey)}
                    className="btn btn-secondary text-xs flex items-center gap-2 disabled:opacity-50"
                    onClick={async () => {
                      const testEmail = window.prompt('¿A qué correo enviar el correo de prueba?')
                      if (!testEmail) return
                      setSmtpTesting(true)
                      setSmtpTestMsg(null)
                      try {
                        const res = await fetch('/api/email/test', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...getUserHeader(),
                          },
                          body: JSON.stringify({
                            smtpHost: company.smtpHost,
                            smtpPort: company.smtpPort,
                            smtpUser: company.smtpUser,
                            smtpPass: company.smtpPass,
                            smtpFrom: company.smtpFrom,
                            resendApiKey: company.resendApiKey,
                            testEmail,
                          }),
                        })
                        const data = await res.json()
                        if (res.ok) setSmtpTestMsg({ ok: true, text: `✅ Correo de prueba enviado a ${testEmail} (${data.provider || 'ok'})` })
                        else setSmtpTestMsg({ ok: false, text: data.error ?? 'Error desconocido' })
                      } catch { setSmtpTestMsg({ ok: false, text: 'Error de conexión' })
                      } finally { setSmtpTesting(false) }
                    }}
                  >
                    {smtpTesting
                      ? <><span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Enviando...</>
                      : '📤 Enviar correo de prueba'}
                  </button>
                  {smtpTestMsg && (
                    <span className={`text-xs px-3 py-1.5 rounded-lg border ${smtpTestMsg.ok
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                      {smtpTestMsg.text}
                    </span>
                  )}
                </div>
              </div>

              <button
                className="btn btn-primary disabled:opacity-60"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Users size={18} /> Usuarios y roles
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={loadUsers} disabled={usersLoading}
                    className="btn btn-secondary flex items-center gap-2 text-xs">
                    <RefreshCw size={13} className={usersLoading ? 'animate-spin' : ''} />
                    Actualizar
                  </button>
                  <button onClick={openAddUser}
                    className="btn btn-primary flex items-center gap-2 text-xs">
                    <Plus size={14} /> Nuevo usuario
                  </button>
                </div>
              </div>

              {/* Users table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-200 dark:border-gray-700">
                      {['Nombre','Email','Rol','Estado','Acciones'].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading && (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400 dark:text-gray-500 text-sm">Cargando...</td></tr>
                    )}
                    {!usersLoading && users.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400 dark:text-gray-500 text-sm">Sin usuarios</td></tr>
                    )}
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={u.name} size={32} />
                            <span className="font-medium text-slate-800 dark:text-gray-200">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-gray-400 text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${ROLE_COLOR[u.role] ?? 'badge-blue'}`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                            {u.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditUser(u)}
                              className="btn btn-sm btn-secondary flex items-center gap-1.5">
                              <Pencil size={13} /> Editar
                            </button>
                            <button onClick={() => setDeleteTarget(u)}
                              className="btn btn-sm flex items-center gap-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Permissions matrix */}
              <div>
                <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-300 mb-3">Matriz de permisos por rol</h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-200 dark:border-gray-700">
                        <th className="text-left px-4 py-2.5 text-slate-500 dark:text-gray-400 font-semibold">Rol</th>
                        {['Inventario','Catálogo','Clientes','Ventas','Producción'].map((m) => (
                          <th key={m} className="text-center px-3 py-2.5 text-slate-500 dark:text-gray-400 font-semibold">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { role:'Administrador', perms:['✏️ Editar / 🗑️ Eliminar','✏️ Editar / 🗑️ Eliminar','✏️ Editar / 🗑️ Eliminar','✏️ Editar / 🗑️ Eliminar','✏️ Editar / 🗑️ Eliminar'] },
                        { role:'Producción',    perms:['✏️ Editar','Solo lectura','Solo lectura','Solo lectura','✏️ Editar'] },
                        { role:'Ventas',        perms:['Solo lectura','Solo lectura','✏️ Editar','✏️ Editar','Solo lectura'] },
                        { role:'Inventario',    perms:['✏️ Editar','✏️ Editar','Solo lectura','Solo lectura','Solo lectura'] },
                        { role:'Contabilidad',  perms:['Solo lectura','Solo lectura','Solo lectura','Solo lectura','Solo lectura'] },
                      ].map((row) => (
                        <tr key={row.role} className="border-b border-slate-100 dark:border-gray-700">
                          <td className="px-4 py-2.5">
                            <span className={`badge ${ROLE_COLOR[row.role]}`}>{row.role}</span>
                          </td>
                          {row.perms.map((p, i) => (
                            <td key={i} className={`px-3 py-2.5 text-center ${
                              p.includes('Eliminar') ? 'text-red-600 dark:text-red-400 font-medium' :
                              p.includes('Editar')   ? 'text-blue-600 dark:text-blue-400' :
                              'text-slate-400 dark:text-gray-500'
                            }`}>{p}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">
                  Solo el rol <strong>Administrador</strong> puede eliminar registros en cualquier módulo.
                </p>
              </div>

              {/* ── Add / Edit User Modal ── */}
              {userModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-base font-bold text-slate-800 dark:text-white">
                        {userModal === 'add' ? 'Nuevo usuario' : 'Editar usuario'}
                      </h3>
                      <button onClick={closeUserModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="label">Nombre completo *</label>
                        <input className="input" value={userForm.name}
                          onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Juan Pérez" />
                      </div>
                      <div>
                        <label className="label">Correo electrónico *</label>
                        <input className="input" type="email" value={userForm.email}
                          onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="juan@empresa.com" />
                      </div>
                      <div>
                        <label className="label">
                          Contraseña {userModal === 'edit' && <span className="text-slate-400 font-normal">(dejar vacío para no cambiar)</span>}
                          {userModal === 'add' && ' *'}
                        </label>
                        <div className="relative">
                          <input className="input pr-10"
                            type={showFormPwd ? 'text' : 'password'}
                            value={userForm.password}
                            onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                            placeholder="••••••••" />
                          <button type="button"
                            onClick={() => setShowFormPwd((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showFormPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="label">Rol</label>
                        <select className="input" value={userForm.role}
                          onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}>
                          {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-gray-600 rounded-lg">
                        <span className="text-sm text-slate-700 dark:text-gray-200">Usuario activo</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer"
                            checked={userForm.isActive}
                            onChange={(e) => setUserForm((f) => ({ ...f, isActive: e.target.checked }))} />
                          <div className="w-9 h-5 bg-slate-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                        </label>
                      </div>

                      {userError && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg">
                          {userError}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <button onClick={closeUserModal} className="btn btn-secondary" disabled={userSaving}>
                        Cancelar
                      </button>
                      <button onClick={handleSaveUser} disabled={userSaving}
                        className="btn btn-primary disabled:opacity-60 flex items-center gap-2">
                        {userSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                        {userSaving ? 'Guardando...' : userModal === 'add' ? 'Crear usuario' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Delete confirmation modal ── */}
              {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                        <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Eliminar usuario</h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Esta acción no se puede deshacer</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-gray-300 mb-5">
                      ¿Eliminar a <strong>{deleteTarget.name}</strong> ({deleteTarget.email})?
                    </p>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary" disabled={deleting}>
                        Cancelar
                      </button>
                      <button onClick={handleDeleteUser} disabled={deleting}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors">
                        {deleting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={14} />}
                        {deleting ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pagos' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2"><CreditCard size={18} /> Métodos de pago</h2>
              <div className="space-y-2">
                {payMethods.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-gray-600 rounded-lg">
                    <span className="text-sm font-medium text-slate-700 dark:text-gray-200">{m.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={`badge ${m.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {m.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={m.isActive} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary"><span>+ Agregar método</span></button>
            </div>
          )}

          {activeTab === 'precios' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Listas de precios</h3>
                  <p className="text-sm text-slate-500 dark:text-gray-400">Define listas con descuentos predeterminados para asignar a clientes</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { setPlForm({ name: '', discountPercent: 0, isActive: true }); setEditingPL(null); setPlModal('add') }}>
                  <Plus size={14} /> Nueva lista
                </button>
              </div>

              {priceLists.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-gray-500">
                  <Tag size={40} className="mx-auto opacity-30 mb-3" />
                  <p className="text-sm">No hay listas de precios configuradas</p>
                  <p className="text-xs mt-1">Crea una para asignar descuentos automáticos a tus clientes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {priceLists.map((pl) => (
                    <div key={pl.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pl.isActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-gray-600'}`}>
                          <Tag size={18} className={pl.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white text-sm">{pl.name}</p>
                          <p className="text-xs text-slate-500 dark:text-gray-400">Descuento: {pl.discountPercent}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${pl.isActive ? 'badge-green' : 'badge-gray'}`}>{pl.isActive ? 'Activa' : 'Inactiva'}</span>
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          onClick={() => { setEditingPL(pl); setPlForm({ name: pl.name, discountPercent: pl.discountPercent, isActive: pl.isActive }); setPlModal('edit') }}>
                          <Pencil size={14} />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          onClick={() => setPlDelTarget(pl.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Price list modal */}
              {plModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
                      <h3 className="font-semibold text-slate-800 dark:text-white">{plModal === 'add' ? 'Nueva lista de precios' : 'Editar lista'}</h3>
                      <button onClick={() => setPlModal(null)}><X size={18} className="text-slate-400" /></button>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                      <div>
                        <label className="label">Nombre *</label>
                        <input className="input" value={plForm.name} onChange={(e) => setPlForm({ ...plForm, name: e.target.value })} placeholder="ej. Mayorista, VIP, Distribuidor" />
                      </div>
                      <div>
                        <label className="label">Descuento por defecto (%)</label>
                        <input className="input" type="number" min="0" max="100" step="0.5" value={plForm.discountPercent}
                          onChange={(e) => setPlForm({ ...plForm, discountPercent: parseFloat(e.target.value) || 0 })} />
                        <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Se aplica automáticamente al crear ventas/cotizaciones para clientes con esta lista</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="pl-active" checked={plForm.isActive} onChange={(e) => setPlForm({ ...plForm, isActive: e.target.checked })} className="rounded" />
                        <label htmlFor="pl-active" className="text-sm text-slate-700 dark:text-gray-300">Lista activa</label>
                      </div>
                    </div>
                    <div className="flex gap-3 px-6 pb-5">
                      <button className="btn btn-secondary flex-1" onClick={() => setPlModal(null)}>Cancelar</button>
                      <button className="btn btn-primary flex-1" onClick={() => {
                        if (!plForm.name.trim()) return
                        if (plModal === 'add') {
                          addPriceList({ id: `pl${Date.now()}`, ...plForm })
                        } else if (editingPL) {
                          updatePriceList({ ...editingPL, ...plForm })
                        }
                        setPlModal(null)
                      }}>
                        {plModal === 'add' ? 'Crear lista' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete confirmation */}
              {plDelTarget && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-fadeIn p-6 text-center">
                    <AlertTriangle size={40} className="mx-auto text-red-500 mb-3" />
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Eliminar lista de precios</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">Los clientes asignados a esta lista perderán su descuento automático.</p>
                    <div className="flex gap-3">
                      <button className="btn btn-secondary flex-1" onClick={() => setPlDelTarget(null)}>Cancelar</button>
                      <button className="btn bg-red-600 hover:bg-red-700 text-white flex-1" onClick={() => { deletePriceList(plDelTarget); setPlDelTarget(null) }}>Eliminar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'impuestos' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Percent size={18} /> Tasas de impuesto</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
                    {['Nombre','Tasa','Por defecto','Estado'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {taxes.map((t) => (
                    <tr key={t.id} className="table-row">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-gray-200">{t.name}</td>
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-gray-200">{t.rate}%</td>
                      <td className="px-4 py-3">{t.isDefault && <span className="badge badge-blue">Por defecto</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${t.isActive ? 'badge-green' : 'badge-gray'}`}>
                          {t.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'notificaciones' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Bell size={18} /> Configuración de alertas</h2>
              <div className="space-y-3">
                {[
                  ['Alertas de stock bajo', true],
                  ['Recordatorio de pagos pendientes', true],
                  ['Resumen diario de ventas', true],
                  ['Notificaciones de nuevas órdenes', true],
                  ['Reporte semanal automático', false],
                  ['Alertas por email', true],
                  ['Notificaciones push', true],
                ].map(([label, def]: any) => (
                  <div key={label} className="flex items-center justify-between p-3 border border-slate-200 dark:border-gray-600 rounded-lg">
                    <span className="text-sm text-slate-700 dark:text-gray-200">{label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={def} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:peer-checked:translate-x-full"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-5">
              <WhatsAppConnectionPanel />
              <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2"><MessageCircle size={18} className="text-green-600" /> Plantillas de WhatsApp</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Estas plantillas se usan para enviar mensajes automáticos por WhatsApp. Los textos entre <code className="px-1 py-0.5 bg-slate-100 dark:bg-gray-700 rounded text-xs">{'{placeholder}'}</code> se reemplazan automáticamente con datos reales.
              </p>
              <div className="space-y-4">
                {(Object.entries(WA_TEMPLATES) as [WaTemplateKey, string][]).map(([key, template]) => {
                  const labelMap: Record<WaTemplateKey, string> = {
                    orderConfirmation: 'Confirmación de pedido',
                    paymentReminder: 'Recordatorio de pago',
                    dispatchNotification: 'Notificación de despacho',
                    deliveryConfirmation: 'Confirmación de entrega',
                    followUp: 'Seguimiento post-venta',
                    bulkPaymentReminder: 'Cobro masivo',
                  }
                  const descMap: Record<WaTemplateKey, string> = {
                    orderConfirmation: 'Se envía al confirmar una orden de venta',
                    paymentReminder: 'Se envía para recordar pagos pendientes',
                    dispatchNotification: 'Se envía cuando se programa un despacho',
                    deliveryConfirmation: 'Se envía al confirmar la entrega',
                    followUp: 'Se envía como seguimiento después de la venta',
                    bulkPaymentReminder: 'Se envía cuando un cliente tiene múltiples órdenes pendientes',
                  }
                  return (
                    <div key={key} className="border border-slate-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">{labelMap[key]}</p>
                          <p className="text-xs text-slate-500 dark:text-gray-400">{descMap[key]}</p>
                        </div>
                        <span className="text-xs font-mono text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded">{key}</span>
                      </div>
                      <div className="p-4">
                        <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-gray-300 bg-slate-50 dark:bg-gray-800 rounded-lg p-4 border border-slate-100 dark:border-gray-700 font-sans leading-relaxed">{template}</pre>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">💡 Variables disponibles</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {[
                    ['{cliente}', 'Nombre del cliente'],
                    ['{empresa}', 'Nombre de tu empresa'],
                    ['{orden}', 'Número de orden'],
                    ['{fecha}', 'Fecha de la orden'],
                    ['{total}', 'Total formateado en COP'],
                    ['{metodo_pago}', 'Método de pago'],
                    ['{productos}', 'Lista de productos'],
                    ['{estado_pago}', 'Estado del pago'],
                    ['{despacho}', 'Número de despacho'],
                    ['{conductor}', 'Nombre del conductor'],
                    ['{direccion}', 'Dirección de entrega'],
                    ['{datos_bancarios}', 'Datos bancarios'],
                  ].map(([variable, desc]) => (
                    <div key={variable} className="flex items-start gap-2 text-xs">
                      <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-blue-700 dark:text-blue-400 font-mono flex-shrink-0">{variable}</code>
                      <span className="text-blue-600 dark:text-blue-400">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Shield size={18} /> Seguridad del sistema</h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">🔐 Autenticación de dos factores (2FA)</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Agrega una capa extra de seguridad a todas las cuentas</p>
                  <button className="btn btn-secondary btn-sm mt-2">Configurar 2FA</button>
                </div>
                <div>
                  <label className="label">Tiempo de sesión (minutos)</label>
                  <select className="input w-48">
                    {['30','60','120','240','480'].map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">IPs permitidas (dejar vacío para permitir todas)</label>
                  <textarea className="input h-20 resize-none" placeholder="192.168.1.1&#10;10.0.0.0/24" />
                </div>
                <div className="p-4 bg-slate-50 dark:bg-gray-700 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-gray-300">POLÍTICA DE CONTRASEÑAS</p>
                  {['Mínimo 8 caracteres','Incluir número','Incluir mayúscula','Incluir símbolo especial'].map((r) => (
                    <div key={r} className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:peer-checked:translate-x-full"></div>
                      </label>
                      <span className="text-sm text-slate-600 dark:text-gray-300">{r}</span>
                    </div>
                  ))}
                </div>

                {/* ── Factory reset ── */}
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">Restablecer de fábrica</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Elimina <strong>todos</strong> los datos: insumos, productos, órdenes, clientes, ventas y configuración. Esta acción es <strong>irreversible</strong>.
                      </p>
                      <button
                        className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                        onClick={() => { setShowResetModal(true); setResetConfirmText('') }}
                      >
                        <RotateCcw size={14} /> Restablecer aplicación
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'auditoria' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <ClipboardList size={18} /> Registro de auditoría
                </h2>
                <button onClick={loadAudit} disabled={auditLoading}
                  className="btn btn-secondary flex items-center gap-2 text-xs">
                  <RefreshCw size={13} className={auditLoading ? 'animate-spin' : ''} />
                  Actualizar
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-8 text-sm" placeholder="Buscar por usuario, entidad o acción..."
                  value={auditSearch} onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1) }} />
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-200 dark:border-gray-700">
                      {['Fecha y hora','Usuario','Acción','Módulo','Registro','Detalle'].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAudit.map((entry) => (
                        <tr key={entry.id} className="border-b border-slate-100 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-colors">
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500 dark:text-gray-400">
                            {new Date(entry.createdAt).toLocaleString('es-CO', { dateStyle:'short', timeStyle:'short' })}
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-slate-700 dark:text-gray-200 text-xs">{entry.userName}</p>
                            <p className="text-slate-400 dark:text-gray-500 text-xs">{entry.userEmail}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_BADGE[entry.action] ?? 'bg-slate-100 text-slate-600'}`}>
                              {entry.action}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-gray-300 whitespace-nowrap">{entry.entity}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-700 dark:text-gray-200">{entry.entityName ?? '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-400 dark:text-gray-500">{entry.details ?? '—'}</td>
                        </tr>
                      ))}
                    {auditLog.length === 0 && !auditLoading && (
                      <tr><td colSpan={6} className="text-center py-10 text-slate-400 dark:text-gray-600 text-sm">
                        Sin registros de auditoría
                      </td></tr>
                    )}
                    {auditLoading && (
                      <tr><td colSpan={6} className="text-center py-10 text-slate-400 dark:text-gray-600 text-sm">
                        Cargando...
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={auditPage} total={filteredAudit.length} pageSize={AUDIT_PAGE_SIZE} onPage={setAuditPage} />
            </div>
          )}

          {/* ── Reset confirmation modal ── */}
          {showResetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">¿Restablecer de fábrica?</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-gray-300 mb-4">
                  Se borrarán <strong>todos</strong> los registros de la base de datos y la sesión actual. No hay forma de deshacer esto.
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
                  Escribe <span className="text-red-600 font-mono">RESTABLECER</span> para confirmar:
                </p>
                <input
                  className="input mb-4"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESTABLECER"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowResetModal(false)}
                    disabled={resetting}
                  >
                    Cancelar
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors"
                    onClick={handleFactoryReset}
                    disabled={resetConfirmText !== 'RESTABLECER' || resetting}
                  >
                    {resetting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <RotateCcw size={14} />
                    )}
                    {resetting ? 'Restableciendo...' : 'Sí, restablecer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manual' && <UserManual />}
        </div>
      </div>
    </div>
  )
}

// ── WhatsApp connection (Baileys) ────────────────────────────────────────────
function WhatsAppConnectionPanel() {
  const [info, setInfo] = useState<{ available: boolean; status: string; qr: string | null; error: string | null } | null>(null)
  const [busy, setBusy] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status', {
        headers: { ...getAuthHeader() },
      })
      if (res.ok) setInfo(await res.json())
    } catch { /* offline */ }
  }

  useEffect(() => {
    fetchStatus()
    const id = window.setInterval(fetchStatus, 10000)
    return () => window.clearInterval(id)
  }, [])

  const connect = async () => {
    setBusy(true)
    try {
      await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { ...getAuthHeader() },
      })
      await fetchStatus()
    } finally { setBusy(false) }
  }

  const logout = async () => {
    if (!confirm('¿Cerrar sesión de WhatsApp en el servidor? Tendrás que escanear el QR de nuevo.')) return
    setBusy(true)
    try {
      await fetch('/api/whatsapp/logout', {
        method: 'POST',
        headers: { ...getAuthHeader() },
      })
      await fetchStatus()
    } finally { setBusy(false) }
  }

  const statusLabel: Record<string, { text: string; color: string }> = {
    connected:    { text: 'Conectado',         color: 'text-green-600 dark:text-green-400' },
    qr:           { text: 'Esperando escaneo', color: 'text-amber-600 dark:text-amber-400' },
    connecting:   { text: 'Conectando…',       color: 'text-blue-600 dark:text-blue-400' },
    disconnected: { text: 'Desconectado',      color: 'text-slate-500 dark:text-gray-400' },
  }
  const s = info?.status || 'disconnected'
  const label = statusLabel[s] || statusLabel.disconnected

  return (
    <div className="border border-slate-200 dark:border-gray-600 rounded-xl p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <MessageCircle size={18} className="text-green-600" /> Envío automático de WhatsApp
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Vincula tu número una sola vez. El servidor enviará automáticamente los recordatorios de calendario sin que tengas que abrir nada.
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-white dark:bg-gray-800 ${label.color}`}>
          ● {label.text}
        </span>
      </div>

      {info && !info.available && (
        <div className="text-xs p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300">
          La librería de WhatsApp no está instalada. Ejecuta <code className="font-mono bg-white dark:bg-gray-800 px-1 rounded">npm install</code> en el servidor para activarla.
        </div>
      )}

      {info?.available && s === 'qr' && info.qr && (
        <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-sm font-medium text-slate-700 dark:text-gray-200 text-center">
            Abre WhatsApp en tu celular → Menú → Dispositivos vinculados → Vincular dispositivo
          </p>
          <img src={info.qr} alt="QR de WhatsApp" className="w-64 h-64" />
          <p className="text-xs text-slate-500 dark:text-gray-400">El QR se actualiza automáticamente cada pocos segundos.</p>
        </div>
      )}

      {info?.available && s === 'connected' && (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-slate-700 dark:text-gray-200">
            ✅ Tu número está vinculado. Los recordatorios marcados con &quot;Enviar por WhatsApp&quot; se enviarán automáticamente.
          </p>
          <button onClick={logout} disabled={busy}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50">
            Desvincular
          </button>
        </div>
      )}

      {info?.available && (s === 'disconnected' || s === 'connecting') && (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-slate-700 dark:text-gray-200">
            {s === 'connecting' ? 'Iniciando conexión…' : 'Sin sesión activa.'}
            {info.error && <span className="block text-xs text-rose-600 mt-1">{info.error}</span>}
          </p>
          <button onClick={connect} disabled={busy}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
            {busy ? '…' : 'Generar QR'}
          </button>
        </div>
      )}
    </div>
  )
}
