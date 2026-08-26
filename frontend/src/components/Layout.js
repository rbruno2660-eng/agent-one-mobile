import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, MessageSquare, Package, BarChart2,
  Users, Settings, LogOut, Wrench, TrendingUp, BookOpen, RefreshCcw, Menu, X
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/inbox',         label: 'Inbox',        icon: MessageSquare },
  { href: '/catalog',       label: 'Catálogo',     icon: Package },
  { href: '/leads',         label: 'Leads',        icon: TrendingUp },
  { href: '/trades',        label: 'Trocas',       icon: RefreshCcw },
  { href: '/services',      label: 'Manutenção',   icon: Wrench },
  { href: '/knowledge',     label: 'Knowledge',    icon: BookOpen },
  { href: '/analytics',     label: 'Analytics',    icon: BarChart2 },
  { href: '/team',          label: 'Equipe',       icon: Users },
  { href: '/settings',      label: 'Configurações',icon: Settings },
];

function SidebarContent({ router, user, logout, onNav }) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="font-bold text-white text-lg leading-none">Agent One</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Mobile Store</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = router.pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNav}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm font-medium transition',
                active ? 'text-white bg-blue-600' : 'hover:bg-white/5'
              )}
              style={{ color: active ? '#fff' : 'var(--muted)' }}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="text-sm text-white font-medium truncate">{user?.name}</div>
        <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{user?.email}</div>
        <button
          onClick={logout}
          className="flex items-center gap-2 mt-3 text-xs transition hover:text-red-400"
          style={{ color: 'var(--muted)' }}
        >
          <LogOut size={13} /> Sair
        </button>
      </div>
    </>
  );
}

export default function Layout({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [router.pathname]);

  // Current page label for mobile header
  const currentPage = navItems.find(n => router.pathname.startsWith(n.href))?.label || 'Agent One';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── DESKTOP SIDEBAR ─────────────────────────── */}
      <aside
        className="hidden md:flex w-56 flex-shrink-0 flex-col border-r"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <SidebarContent router={router} user={user} logout={logout} onNav={() => {}} />
      </aside>

      {/* ── MOBILE DRAWER OVERLAY ───────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ───────────────────────────── */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 flex flex-col border-r transition-transform duration-300 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition"
          style={{ color: 'var(--muted)' }}
        >
          <X size={18} />
        </button>
        <SidebarContent router={router} user={user} logout={logout} onNav={() => setOpen(false)} />
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header
          className="flex md:hidden items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl hover:bg-white/10 transition"
            style={{ color: 'var(--muted)' }}
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-white text-sm flex-1">{currentPage}</span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'var(--primary)' }}
          >
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function withLayout(Component) {
  Component.getLayout = (page) => <Layout>{page}</Layout>;
  return Component;
}
