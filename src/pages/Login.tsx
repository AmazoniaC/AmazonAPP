import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, LogIn, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store/useStore'

const FEATURES = [
  'Control completo de inventario y materias primas',
  'Órdenes de producción con seguimiento en tiempo real',
  'Gestión de ventas y cartera de clientes',
  'Reportes financieros y análisis de costos',
]

const SERVER_DOWN =
  'No hay conexión con el servidor. Cierra la terminal y ejecuta "npm run dev", ' +
  'que arranca el backend y la app juntos. Si ya lo hiciste, revisa que PostgreSQL esté encendido.'

export default function Login() {
  const navigate = useNavigate()
  const login           = useStore((s) => s.login)
  const companySettings = useStore((s) => s.companySettings)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      // 503 = el proxy no encontró el backend; no es un problema de credenciales
      if (res.status === 503) {
        setError(SERVER_DOWN)
        setLoading(false)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Correo o contraseña incorrectos')
        setLoading(false)
        return
      }
      login({ name: data.name, email: data.email, role: data.role, token: data.token })
      navigate('/', { replace: true })
    } catch {
      setError(SERVER_DOWN)
      setLoading(false)
    }
  }

  const logo = companySettings.logo

  return (
    <div className="min-h-screen flex mesh-amazonia">

      {/* ── Left: form panel ──────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 min-w-0 relative">
        {/* Floating decorative orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none animate-float"
             style={{ background: 'radial-gradient(circle, rgba(151, 190, 130, 0.4) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none animate-float"
             style={{ background: 'radial-gradient(circle, rgba(168, 112, 80, 0.3) 0%, transparent 70%)', animationDelay: '1.5s' }} />

        <div className="w-full max-w-sm relative z-10">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            {logo ? (
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-3xl blur-2xl opacity-50"
                     style={{ background: 'radial-gradient(circle, rgba(82, 125, 54, 0.4) 0%, transparent 70%)' }} />
                <img
                  src={logo}
                  alt={companySettings.companyName}
                  className="relative h-48 w-auto object-contain drop-shadow-xl"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                   style={{
                     background: 'linear-gradient(135deg, #527d36 0%, #2d4a1e 100%)',
                     boxShadow: '0 16px 40px -8px rgba(45, 74, 30, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                   }}>
                <Leaf size={36} className="text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold gradient-text tracking-tight">
              {companySettings.companyName || 'Amazonia ERP'}
            </h1>
            {companySettings.slogan && (
              <p className="text-sm text-amazonia-700/70 mt-1 font-medium">{companySettings.slogan}</p>
            )}
          </div>

          {/* Form */}
          <div className="glass-strong rounded-3xl p-8 border border-white/60"
               style={{ boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.05)' }}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Iniciar sesión</h2>
            <p className="text-sm text-slate-500 mb-6">Accede con tus credenciales corporativas</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Correo electrónico</label>
                <input
                  type="email"
                  className="input"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-700 bg-red-50/80 border border-red-200/70 px-3 py-2.5 rounded-xl flex items-center gap-2 animate-scaleIn">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center py-2.5 mt-2 disabled:opacity-60"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn size={16} />
                )}
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-5 border-t border-stone-100 pt-4">
              Acceso admin: <span className="font-mono">admin@empresa.com</span> / <span className="font-mono">admin123</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: brand panel ───────────────────────── */}
      <div className="hidden lg:flex w-[480px] flex-col justify-between px-12 py-14 relative overflow-hidden"
           style={{
             background: 'linear-gradient(135deg, #1e3315 0%, #12200d 50%, #0a1408 100%)',
           }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none animate-float"
             style={{ background: 'radial-gradient(circle, rgba(82, 125, 54, 0.35) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full blur-3xl pointer-events-none animate-float"
             style={{ background: 'radial-gradient(circle, rgba(168, 112, 80, 0.25) 0%, transparent 70%)', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-50"
             style={{ background: 'radial-gradient(circle, rgba(151, 190, 130, 0.10) 0%, transparent 70%)' }} />

        <div className="relative z-10">
          <span className="inline-block text-amazonia-400 text-xs font-semibold tracking-widest uppercase mb-2">
            Sistema ERP
          </span>
          <h2 className="text-4xl font-extrabold text-white leading-tight mt-2">
            Gestión inteligente<br />
            <span className="text-amazonia-400">para tu negocio</span>
          </h2>
          <p className="text-amazonia-300 mt-4 text-sm leading-relaxed">
            Centraliza la producción, inventario y ventas con herramientas
            auditables y en tiempo real, diseñadas para crecer contigo.
          </p>

          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-amazonia-400 flex-shrink-0 mt-0.5" />
                <span className="text-amazonia-200 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom brand badge */}
        <div className="relative z-10 flex items-center gap-3 border-t border-amazonia-800/60 pt-6 mt-6">
          {logo ? (
            <img src={logo} alt="" className="h-10 w-10 object-contain rounded opacity-90" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amazonia-700 flex items-center justify-center">
              <Leaf size={20} className="text-white" />
            </div>
          )}
          <div>
            <p className="text-white font-bold text-sm">{companySettings.companyName || 'Amazonia Concrete'}</p>
            <p className="text-amazonia-400 text-xs">{companySettings.slogan || 'Belleza Natural En Concreto'}</p>
          </div>
        </div>
      </div>

    </div>
  )
}
