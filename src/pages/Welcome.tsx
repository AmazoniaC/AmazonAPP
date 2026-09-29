import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Bell, User, Leaf, Instagram, Facebook, Linkedin, MessageCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { MODULE_GROUPS, modulesForRole, type AppModule } from '../config/modules'

// ── Module grid: grouped by category, same groups as the header switcher
// and the mobile "Más" sheet, so the three navigation surfaces read the same. ─
function GroupedModuleGrid({ modules }: { modules: AppModule[] }) {
  let tileIdx = 0
  return (
    <div>
      {MODULE_GROUPS.map((group) => {
        const items = modules.filter((m) => m.group === group)
        if (items.length === 0) return null
        return (
          <div key={group} className="mb-6 last:mb-0">
            <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-amazonia-800/50">
              {group}
            </p>
            <div className="welcome-grid">
              {items.map((m) => {
                const idx = tileIdx++
                return (
                  <Link
                    key={m.to}
                    to={m.to}
                    className="welcome-tile group"
                    style={{ animationDelay: `${idx * 30}ms` }}
                    title={m.label}
                  >
                    <m.icon size={26} className="text-amazonia-900 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                    <span className="welcome-tile-label">{m.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Welcome page ─────────────────────────────────────────────────────────────
export default function Welcome() {
  const { user, logout, companySettings, notifications } = useStore()
  const navigate = useNavigate()
  const unread = notifications.filter((n) => !n.read).length

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const visibleModules = modulesForRole(user?.role ?? 'Administrador')
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AG'

  const logo = companySettings.logo

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background:
          'radial-gradient(at 20% 30%, rgba(220, 230, 200, 0.35) 0px, transparent 50%),' +
          'radial-gradient(at 80% 70%, rgba(207, 220, 195, 0.30) 0px, transparent 50%),' +
          'linear-gradient(135deg, #f5f3eb 0%, #efeee5 50%, #ebe9de 100%)',
      }}
    >
      {/* Top-right toolbar */}
      <div className="absolute top-5 right-6 z-20 flex items-center gap-3">
        <Link
          to="/dashboard"
          className="relative w-11 h-11 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:shadow-soft transition-all border border-white/60"
          title="Notificaciones"
        >
          <Bell size={18} className="text-amazonia-800" strokeWidth={1.6} />
          {unread > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          )}
        </Link>
        <Link
          to="/settings"
          className="w-11 h-11 rounded-full bg-amazonia-900 flex items-center justify-center hover:bg-amazonia-800 hover:shadow-soft transition-all"
          title={user?.name ?? 'Perfil'}
        >
          {user
            ? <span className="text-white text-xs font-bold tracking-wide">{initials}</span>
            : <User size={18} className="text-white" strokeWidth={1.6} />}
        </Link>
      </div>

      {/* Main content grid */}
      {/* Una sola columna en teléfono; el panel de marca solo aparece cuando hay
          ancho de sobra, para que los módulos nunca queden fuera de pantalla. */}
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 items-start gap-8
                      px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,460px),minmax(0,1fr)] lg:gap-12 lg:px-12 lg:py-14">

        {/* ─── LEFT: Brand panel ─── */}
        <div className="hidden h-full flex-col justify-between pt-6 lg:flex">
          <div className="flex flex-1 items-center justify-center">
            {logo ? (
              <img
                src={logo}
                alt="Amazonia Concrete"
                className="h-auto w-full max-w-[420px] object-contain"
              />
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-44 w-44 items-center justify-center rounded-full bg-stone-100">
                  <Leaf size={64} className="text-amazonia-700" strokeWidth={1.6} />
                </div>
                <h2 className="mt-6 text-5xl font-light tracking-[0.3em] text-amazonia-900">AMAZONIA</h2>
                <p className="mt-1 text-base tracking-[0.4em] text-amazonia-700">CONCRETE</p>
              </div>
            )}
          </div>

          {/* Social media */}
          <div className="pl-2">
            <p className="text-xs text-amazonia-800/60 italic mb-3 tracking-wide">redes sociales</p>
            <div className="flex items-center gap-3">
              {companySettings.instagram && (
                <a href={companySettings.instagram} target="_blank" rel="noopener noreferrer"
                   className="w-10 h-10 rounded-full border-[1.5px] border-amazonia-800 flex items-center justify-center text-amazonia-800 hover:bg-amazonia-800 hover:text-white transition-all"
                   title="Instagram">
                  <Instagram size={16} strokeWidth={1.6} />
                </a>
              )}
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"
                 className="w-10 h-10 rounded-full border-[1.5px] border-amazonia-800 flex items-center justify-center text-amazonia-800 hover:bg-amazonia-800 hover:text-white transition-all"
                 title="Facebook">
                <Facebook size={16} strokeWidth={1.6} />
              </a>
              {companySettings.whatsapp && (
                <a href={`https://wa.me/${companySettings.whatsapp.replace(/\D/g, '')}`}
                   target="_blank" rel="noopener noreferrer"
                   className="w-10 h-10 rounded-full border-[1.5px] border-amazonia-800 flex items-center justify-center text-amazonia-800 hover:bg-amazonia-800 hover:text-white transition-all"
                   title="WhatsApp">
                  <MessageCircle size={16} strokeWidth={1.6} />
                </a>
              )}
              <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer"
                 className="w-10 h-10 rounded-full border-[1.5px] border-amazonia-800 flex items-center justify-center text-amazonia-800 hover:bg-amazonia-800 hover:text-white transition-all"
                 title="LinkedIn">
                <Linkedin size={16} strokeWidth={1.6} />
              </a>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Welcome + Module grid ─── */}
        <div className="flex flex-col min-w-0">
          {/* Welcome text */}
          <div className="mb-6 animate-fadeIn lg:mb-8">
            <p className="text-lg font-light tracking-tight text-amazonia-900/85 lg:text-2xl">Bienvenido a</p>
            <h1 className="mt-1 text-[clamp(1.75rem,7vw,3rem)] font-bold leading-tight tracking-tight text-amazonia-900">
              {companySettings.companyName || 'Amazonia Concrete'}
            </h1>
            <div className="mt-3 flex items-center gap-2">
              <Leaf size={16} className="flex-shrink-0 text-amazonia-700" strokeWidth={2} />
              <p className="text-sm tracking-wide text-amazonia-700/80 lg:text-base">
                {(companySettings.slogan || 'Belleza Natural En Concreto').replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
            </div>
          </div>

          {/* Module grid — grouped by category, sourced from config/modules.ts */}
          <GroupedModuleGrid modules={visibleModules} />

          {/* Logout */}
          <div className="mt-10 flex justify-end">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-medium text-sm transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #1e3315 0%, #12200d 100%)',
                boxShadow: '0 8px 24px -6px rgba(18, 32, 13, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              <LogOut size={16} strokeWidth={1.8} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Welcome-tile styles */}
      <style>{`
        /* Grouped grid: each category flows its own wrapping row of tiles,
           same shape on phone and desktop — no horizontal scroll to discover. */
        .welcome-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(92px, 140px));
          gap: 10px;
        }
        @media (min-width: 640px) {
          .welcome-grid { grid-template-columns: repeat(auto-fill, minmax(136px, 168px)); gap: 14px; }
        }

        .welcome-tile {
          aspect-ratio: 1 / 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          background: rgba(255, 255, 255, 0.55);
          border: 1.5px solid rgba(82, 125, 54, 0.18);
          border-radius: 20px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow:
            0 2px 8px -2px rgba(45, 74, 30, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          color: #12200d;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.005em;
          transition: all 280ms cubic-bezier(0.4, 0, 0.2, 1);
          animation: tileIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
          text-align: center;
          padding: 12px;
        }
        .welcome-tile:hover {
          background: rgba(255, 255, 255, 0.85);
          border-color: rgba(82, 125, 54, 0.45);
          transform: translateY(-3px) scale(1.02);
          box-shadow:
            0 14px 32px -10px rgba(45, 74, 30, 0.22),
            0 4px 8px -4px rgba(45, 74, 30, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }
        .welcome-tile-label {
          color: #1a3312;
          font-weight: 500;
          font-size: 13px;
          line-height: 1.2;
        }
        @keyframes tileIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
