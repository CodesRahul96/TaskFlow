import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Calendar, FileText, User,
  LogOut, Menu, X, Zap, Bell, ChevronRight, Users
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/audit', icon: FileText, label: 'Audit Trail', authOnly: true },
  { to: '/profile', icon: User, label: 'Profile', authOnly: true },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, isGuest, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'G';

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-60' : 'w-16'} flex-shrink-0 flex flex-col bg-bg-secondary border-r border-border-subtle transition-all duration-300 relative z-20`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border-subtle">
          <div className="w-8 h-8 bg-accent-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-glow-sm">
            <Zap size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-display font-bold text-lg text-text-primary tracking-tight">
              TaskFlow
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-text-muted hover:text-text-primary transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Guest badge */}
        {isGuest && sidebarOpen && (
          <div className="mx-3 mt-3 px-3 py-2 bg-neon-yellow/10 border border-neon-yellow/30 rounded-lg">
            <p className="text-neon-yellow text-xs font-medium">Guest Mode</p>
            <p className="text-text-muted text-xs mt-0.5">Data saved locally</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-1.5 text-xs text-accent-glow hover:text-white transition-colors"
            >
              Sign in to sync →
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, exact, authOnly }) => {
            if (authOnly && isGuest) return null;
            return (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-accent-primary/20 text-accent-glow border border-accent-primary/30 shadow-glow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="text-sm font-medium">{label}</span>
                    <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border-subtle">
          {!isGuest ? (
            <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center'}`}>
              <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
                  <p className="text-xs text-text-muted truncate">{user?.email}</p>
                </div>
              )}
              {sidebarOpen && (
                <button
                  onClick={logout}
                  className="text-text-muted hover:text-neon-red transition-colors p-1 rounded"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className={`flex items-center gap-3 w-full px-3 py-2 bg-accent-primary/20 border border-accent-primary/30 rounded-lg text-accent-glow hover:bg-accent-primary/30 transition-all ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              <User size={16} />
              {sidebarOpen && <span className="text-sm font-medium">Sign In</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
