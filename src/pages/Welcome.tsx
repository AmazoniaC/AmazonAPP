import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Package, ArrowLeftRight, Factory,
  ShoppingCart, FileText, Truck, Navigation, Users, Kanban, RotateCcw,
  Building2, Banknote, Wallet, Receipt, BookOpen, BarChart3, Settings,
  LogOut, Bell, User, Leaf, Instagram, Facebook, Linkedin, MessageCircle,
} from 'lucide-react'
import { useStore } from '../store/useStore'

// ── Module grid (5 columns × 4 rows = 19 modules) ────────────────────────────
const MODULES: { to: string; icon: React.ElementType; label: string; roles?: string[] }[] = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar',    icon: CalendarDays,    label: 'Calendario' },
  { to: '/inventory',   icon: Package,         label: 'Inventario',   roles: ['Administrador','Inventario','Producción'] },
  { to: '/inventory/movements', icon: ArrowLeftRight, label: 'Movimientos', roles: ['Administrador','Inventario'] },
  { to: '/production',  icon: Factory,         label: 'Producción',   roles: ['Administrador','Producción'] },
  { to: '/sales',       icon: ShoppingCart,    label: 'Ventas',       roles: ['Administrador','Ventas','Contabilidad'] },
  { to: '/quotations',  icon: FileText,        label: 'Cotizaciones', roles: ['Administrador','Ventas'] },
  { to: '/purchases',   icon: Truck,           label: 'Compras',      roles: ['Administrador','Inventario','Contabilidad'] },
  { to: '/dispatch',    icon: Navigation,      label: 'Despachos',    roles: ['Administrador','Ventas','Producción'] },
  { to: '/crm',         icon: Users,           label: 'Clientes',     roles: ['Administrador','Ventas'] },
  { to: '/pipeline',    icon: Kanban,          label: 'Pipeline',     roles: ['Administrador','Ventas'] },
  { to: '/returns',     icon: RotateCcw,       label: 'Devoluciones', roles: ['Administrador','Ventas'] },
  { to: '/suppliers',   icon: Building2,       label: 'Proveedores',  roles: ['Administrador','Inventario','Contabilidad'] },
  { to: '/payments',    icon: Banknote,        label: 'Pagos',        roles: ['Administrador','Contabilidad','Ventas'] },
  { to: '/cartera',     icon: Wallet,          label: 'Cartera',      roles: ['Administrador','Contabilidad','Ventas'] },
  { to: '/expenses',    icon: Receipt,         label: 'Gastos',       roles: ['Administrador','Contabilidad'] },
  { to: '/catalog',     icon: BookOpen,        label: 'Catálogo',     roles: ['Administrador','Ventas','Inventario'] },
  { to: '/reports',     icon: BarChart3,       label: 'Reportes',     roles: ['Administrador','Contabilidad'] },
  { to: '/settings',    icon: Settings,        label: 'Configuración', roles: ['Administrador'] },
]

// ── Bubble field — interactive floating circles ──────────────────────────────
interface Bubble {
  id:    number
  x:     number   // % of viewport width
  y:     number   // % of viewport height
  size:  number   // px
  delay: number   // s
  dur:   number   // animation duration (s)
  drift: number   // horizontal drift amplitude (px)
  hue:   string   // tint
}

function makeBubbles(count: number): Bubble[] {
  const out: Bubble[] = []
  for (let i = 0; i < count; i++) {
    const size = 24 + Math.random() * 130
    out.push({
      id:    i,
      x:     Math.random() * 100,
      y:     Math.random() * 110 - 5,
      size,
      delay: -Math.random() * 12,
      dur:   12 + Math.random() * 16,
      drift: 20 + Math.random() * 60,
      hue:   Math.random() > 0.5 ? 'rgba(151, 190, 130, 0.30)' : 'rgba(207, 220, 195, 0.32)',
    })
  }
  return out
}

function BubbleField() {
  const bubbles = useMemo(() => makeBubbles(34), [])
  const ref = useRef<HTMLDivElement>(null)
  // Parallax: mouse pos in [-1, 1] relative to center
  const [m, setM] = useState({ x: 0, y: 0 })
  const [pops, setPops] = useState<{ id: number; x: number; y: number }[]>([])
  const popId = useRef(0)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth, h = window.innerHeight
      setM({ x: (e.clientX / w) * 2 - 1, y: (e.clientY / h) * 2 - 1 })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement
    // Only respond to clicks on the field background, not on UI elements
    if (!ref.current || (t !== ref.current && !t.classList.contains('bubble'))) return
    const rect = ref.current.getBoundingClientRect()
    const id = ++popId.current
    setPops((prev) => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
    window.setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== id)), 700)
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className="absolute inset-0 overflow-hidden pointer-events-auto"
      aria-hidden="true"
    >
      {bubbles.map((b) => {
        // Larger bubbles parallax more
        const px = (m.x * b.size) / 20
        const py = (m.y * b.size) / 24
        return (
          <span
            key={b.id}
            className="bubble"
            style={{
              position: 'absolute',
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85) 0%, ${b.hue} 35%, rgba(255,255,255,0.05) 70%)`,
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow:
                'inset 0 0 12px rgba(255, 255, 255, 0.5), 0 4px 12px rgba(82, 125, 54, 0.06)',
              animation: `floatBubble ${b.dur}s ease-in-out ${b.delay}s infinite`,
              transform: `translate(${px}px, ${py}px)`,
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              ['--drift' as string]: `${b.drift}px`,
            } as React.CSSProperties}
          />
        )
      })}
      {/* Click ripples */}
      {pops.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x - 40,
            top: p.y - 40,
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '2px solid rgba(151, 190, 130, 0.6)',
            animation: 'popBubble 0.6s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes floatBubble {
          0%, 100% { transform: translateY(0) translateX(0); }
          25%      { transform: translateY(-30px) translateX(calc(var(--drift) * -0.4)); }
          50%      { transform: translateY(-60px) translateX(0); }
          75%      { transform: translateY(-30px) translateX(var(--drift)); }
        }
        @keyframes popBubble {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ── Module grid: 3 fixed rows, horizontal scroll with custom green bar ───────
function ScrollableModuleGrid({ modules }: { modules: typeof MODULES }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef  = useRef<HTMLDivElement>(null)
  const trackRef  = useRef<HTMLDivElement>(null)
  // Default to visible so the bar paints immediately on first frame
  const [thumb, setThumb] = useState({ left: 0, width: 80, visible: true })
  const drag = useRef<{ startX: number; startScroll: number } | null>(null)

  // Compute thumb size & position from horizontal scroll state
  const recompute = () => {
    const el = scrollRef.current
    const track = trackRef.current
    if (!el || !track) return
    const sw = el.scrollWidth
    const cw = el.clientWidth
    const ratio = cw / sw
    if (ratio >= 1 || sw === 0) {
      setThumb((p) => p.visible ? { left: 0, width: 0, visible: false } : p)
      return
    }
    const trackW = track.clientWidth
    const w = Math.max(60, trackW * ratio)
    const l = (el.scrollLeft / (sw - cw)) * (trackW - w)
    setThumb({ left: l, width: w, visible: true })
  }

  useEffect(() => {
    recompute()
    const ids = [
      window.setTimeout(recompute, 50),
      window.setTimeout(recompute, 200),
      window.setTimeout(recompute, 500),
    ]
    const el = scrollRef.current
    const inner = innerRef.current
    if (!el || !inner) return () => ids.forEach(clearTimeout)
    const onScroll = () => recompute()
    el.addEventListener('scroll', onScroll, { passive: true })
    // Allow vertical wheel to scroll horizontally
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    const ro = new ResizeObserver(() => recompute())
    ro.observe(el)
    ro.observe(inner)
    window.addEventListener('resize', recompute)
    return () => {
      ids.forEach(clearTimeout)
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [modules.length])

  // Drag the thumb
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current || !scrollRef.current || !trackRef.current) return
      const el = scrollRef.current
      const trackW = trackRef.current.clientWidth
      const dx = e.clientX - drag.current.startX
      const ratio = el.clientWidth / el.scrollWidth
      const w = Math.max(60, trackW * ratio)
      const scrollable = el.scrollWidth - el.clientWidth
      const moveable   = trackW - w
      if (moveable <= 0) return
      el.scrollLeft = drag.current.startScroll + (dx / moveable) * scrollable
    }
    const onUp = () => { drag.current = null; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const onThumbDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    drag.current = { startX: e.clientX, startScroll: scrollRef.current.scrollLeft }
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }

  const onTrackDown = (e: React.MouseEvent) => {
    if (!scrollRef.current || !trackRef.current || e.target !== trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const target = (clickX / rect.width) * (scrollRef.current.scrollWidth - scrollRef.current.clientWidth)
    scrollRef.current.scrollTo({ left: target, behavior: 'smooth' })
  }

  return (
    <div className="relative" style={{ paddingBottom: 26 }}>
      {/* Tile grid — 3 fixed rows, columns fill horizontally */}
      <div
        ref={scrollRef}
        className="welcome-scroll-hide"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 6,
        }}
      >
        <div
          ref={innerRef}
          className="welcome-hgrid"
        >
          {modules.map((m, idx) => (
            <Link
              key={m.to}
              to={m.to}
              className="welcome-tile group"
              style={{ animationDelay: `${idx * 30}ms` }}
              title={m.label}
            >
              <m.icon size={28} className="text-amazonia-900 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
              <span className="welcome-tile-label">{m.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Custom horizontal transparent-green scrollbar */}
      {thumb.visible && (
        <div
          ref={trackRef}
          onMouseDown={onTrackDown}
          className="absolute"
          style={{
            left: 4,
            right: 4,
            bottom: 2,
            height: 14,
            borderRadius: 999,
            background: 'rgba(82, 125, 54, 0.18)',
            border: '1.5px solid rgba(82, 125, 54, 0.35)',
            backdropFilter: 'blur(6px)',
            cursor: 'pointer',
            boxShadow:
              'inset 0 1px 2px rgba(82, 125, 54, 0.12), 0 2px 8px rgba(82, 125, 54, 0.10)',
          }}
        >
          <div
            onMouseDown={onThumbDown}
            className="welcome-scrollthumb"
            style={{
              position: 'absolute',
              left: thumb.left,
              top: 1,
              bottom: 1,
              width: thumb.width,
              borderRadius: 999,
              background: 'linear-gradient(180deg, rgba(110, 160, 80, 0.9) 0%, rgba(45, 74, 30, 0.95) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 2px 8px rgba(45, 74, 30, 0.30)',
              cursor: 'grab',
              transition: 'background 180ms ease',
            }}
          />
        </div>
      )}
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

  const role = user?.role ?? 'Administrador'
  const visibleModules = MODULES.filter((m) => !m.roles || m.roles.includes(role))
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
      {/* Interactive bubbles layer */}
      <BubbleField />

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
      <div className="relative z-10 max-w-[1500px] mx-auto px-12 py-14 grid grid-cols-[minmax(0,460px),minmax(0,1fr)] gap-12 items-start min-h-screen">

        {/* ─── LEFT: Brand panel ─── */}
        <div className="flex flex-col h-full justify-between pt-6">
          <div className="flex-1 flex items-center justify-center">
            {logo ? (
              <img
                src={logo}
                alt="Amazonia Concrete"
                className="max-w-[420px] w-full h-auto object-contain drop-shadow-xl animate-float"
                style={{ filter: 'drop-shadow(0 16px 32px rgba(45, 74, 30, 0.18))' }}
              />
            ) : (
              <div className="text-center">
                <div className="w-44 h-44 rounded-full mx-auto flex items-center justify-center mb-4"
                     style={{
                       background: 'linear-gradient(135deg, #f5f3eb 0%, #e0d9c8 100%)',
                       boxShadow: '0 16px 40px -8px rgba(45, 74, 30, 0.25), inset 0 -8px 16px rgba(168, 112, 80, 0.10)',
                     }}>
                  <Leaf size={64} className="text-amazonia-700" strokeWidth={1.6} />
                </div>
                <h2 className="text-5xl font-light text-amazonia-900 tracking-[0.3em] mt-6">AMAZONIA</h2>
                <p className="text-base text-amazonia-700 tracking-[0.4em] mt-1">CONCRETE</p>
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
          <div className="mb-8 animate-fadeIn">
            <p className="text-2xl text-amazonia-900/85 font-light tracking-tight">Bienvenido a</p>
            <h1 className="text-5xl font-bold text-amazonia-900 tracking-tight mt-1 leading-tight">
              {companySettings.companyName || 'Amazonia Concrete'}
            </h1>
            <div className="flex items-center gap-2 mt-3">
              <Leaf size={16} className="text-amazonia-700" strokeWidth={2} />
              <p className="text-base text-amazonia-700/80 tracking-wide">
                {(companySettings.slogan || 'Belleza Natural En Concreto').replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
            </div>
          </div>

          {/* Module grid — 3 rows visible, transparent green scrollbar for the rest */}
          <ScrollableModuleGrid modules={visibleModules} />

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
        /* Native scrollbar hidden — we render our own visible green one above */
        .welcome-scroll-hide { scrollbar-width: none; -ms-overflow-style: none; }
        .welcome-scroll-hide::-webkit-scrollbar { width: 0; height: 0; display: none; }
        .welcome-scrollthumb:hover {
          background: linear-gradient(180deg, rgba(130, 175, 95, 1) 0%, rgba(56, 89, 38, 1) 100%) !important;
        }
        .welcome-scrollthumb:active { cursor: grabbing !important; }

        /* Horizontal grid: exactly 3 rows, columns fill left-to-right.
           Each tile is a fixed-width square so the whole grid grows as wide
           as it needs and overflows horizontally. */
        .welcome-hgrid {
          display: grid;
          grid-template-rows: repeat(3, var(--tile-size, 168px));
          grid-auto-flow: column;
          grid-auto-columns: var(--tile-size, 168px);
          gap: 16px;
          align-content: start;
        }
        @media (min-width: 1280px) {
          .welcome-hgrid { --tile-size: 180px; }
        }
        @media (min-width: 1500px) {
          .welcome-hgrid { --tile-size: 188px; }
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
