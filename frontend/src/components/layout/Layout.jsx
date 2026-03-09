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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isGuest, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'G';

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border-subtle z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent-primary rounded-lg flex items-center justify-center shadow-glow-sm">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-text-primary tracking-tight">
            TaskFlow
          </span>
        </div>
        <button
          onClick={toggleMobileMenu}
          className="p-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Sidebar Backdrop (Mobile) */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar / Drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-bg-secondary border-r border-border-subtle transform transition-transform duration-300 md:relative md:translate-x-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${sidebarOpen ? 'md:w-60' : 'md:w-16'}
          flex flex-col flex-shrink-0
        `}
      >
        {/* Sidebar Header (Desktop) */}
        <div className="hidden md:flex items-center gap-3 px-4 py-5 border-b border-border-subtle">
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

        {/* Sidebar Header (Mobile Toggle Close) */}
        <div className="md:hidden flex items-center justify-between px-4 py-5 border-b border-border-subtle">
          <span className="font-display font-bold text-lg text-text-primary">Menu</span>
          <button onClick={() => setMobileMenuOpen(false)} className="text-text-muted">
            <X size={20} />
          </button>
        </div>

        {/* Guest badge */}
        {isGuest && (sidebarOpen || mobileMenuOpen) && (
          <div className="mx-3 mt-3 px-3 py-2 bg-neon-yellow/10 border border-neon-yellow/30 rounded-lg">
            <p className="text-neon-yellow text-xs font-medium">Guest Mode</p>
            <p className="text-text-muted text-xs mt-0.5">Data saved locally</p>
            <button
              onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
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
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-accent-primary/20 text-accent-glow border border-accent-primary/30 shadow-glow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {(sidebarOpen || mobileMenuOpen) && (
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
        <div className="p-3 border-t border-border-subtle mt-auto">
          {!isGuest ? (
            <div className={`flex items-center gap-3 ${(sidebarOpen || mobileMenuOpen) ? '' : 'justify-center'}`}>
              <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              {(sidebarOpen || mobileMenuOpen) && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
                  <p className="text-xs text-text-muted truncate">{user?.email}</p>
                </div>
              )}
              {(sidebarOpen || mobileMenuOpen) && (
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
              onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 w-full px-3 py-2 bg-accent-primary/20 border border-accent-primary/30 rounded-lg text-accent-glow hover:bg-accent-primary/30 transition-all ${(!sidebarOpen && !mobileMenuOpen) ? 'justify-center' : ''}`}
            >
              <User size={16} />
              {(sidebarOpen || mobileMenuOpen) && <span className="text-sm font-medium">Sign In</span>}
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
