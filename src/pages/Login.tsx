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
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Correo o contraseña incorrectos')
        setLoading(false)
        return
      }
      login({ name: data.name, email: data.email, role: data.role, token: data.token })
      navigate('/', { replace: true })
    } catch {
      setError('No se pudo conectar con el servidor')
      setLoading(false)
    }
  }

  const logo = companySettings.logo

  return (
    <div className="min-h-screen flex">

      {/* ── Left: form panel ──────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-stone-50 px-8 py-12 min-w-0">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            {logo ? (
              <img
                src={logo}
                alt={companySettings.companyName}
                className="h-52 w-auto object-contain mb-5 drop-shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-amazonia-700 flex items-center justify-center mb-5 shadow-lg">
                <Leaf size={36} className="text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-amazonia-900 tracking-tight">
              {companySettings.companyName || 'Amazonia ERP'}
            </h1>
            {companySettings.slogan && (
              <p className="text-sm text-amazonia-600 mt-1 font-medium">{companySettings.slogan}</p>
            )}
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
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
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
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
      <div className="hidden lg:flex w-[480px] flex-col justify-between bg-amazonia-900 px-12 py-14 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amazonia-700/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-earth-500/20 blur-3xl pointer-events-none" />

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
