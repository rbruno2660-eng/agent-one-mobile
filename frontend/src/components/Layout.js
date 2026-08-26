import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, MessageSquare, Package, BarChart2,
  Users, Settings, LogOut, Wrench, TrendingUp, BookOpen, RefreshCcw
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

export default function Layout({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
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
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm font-medium transition',
                  active
                    ? 'text-white bg-blue-600'
                    : 'hover:bg-white/5'
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
        <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
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
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export function withLayout(Component) {
  Component.getLayout = (page) => <Layout>{page}</Layout>;
  return Component;
}
