import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Calendar, FileText, User,
  LogOut, Menu, X, Zap, Bell, Search, PanelLeftClose, PanelLeft,
  ChevronRight, Users, Settings, Sun, Moon
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import BottomNav from './BottomNav';
import NotificationCenter from '../ui/NotificationCenter';
import { useTheme } from '../../context/ThemeProvider';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/calendar', icon: Calendar, label: 'Schedule' },
  { to: '/audit', icon: FileText, label: 'Audit Log', authOnly: true },
  { to: '/settings', icon: Settings, label: 'Settings', authOnly: true },
];

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isGuest, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'G';

  // Tablet Auto-Collapse
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1100 && window.innerWidth >= 768) {
        setSidebarOpen(false);
      } else if (window.innerWidth >= 1100) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Sidebar Backdrop (Mobile Drawer - only for legacy support, BottomNav is primary) */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar / Desktop Menu */}
      <aside
        className={`
          hidden md:flex flex-col flex-shrink-0 bg-bg-secondary border-r border-border-default transition-all duration-500 ease-in-out relative
          ${sidebarOpen ? 'w-[280px]' : 'w-20'}
        `}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-10 w-6 h-6 bg-bg-secondary border border-border-default rounded-full flex items-center justify-center text-text-muted hover:text-accent-primary transition-all z-50 hover:scale-110 shadow-premium"
        >
          {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
        </button>

        {/* Sidebar Header */}
        <div className={`flex items-center gap-3 px-6 h-20 border-b border-border-subtle/50 transition-all ${sidebarOpen ? '' : 'justify-center'}`}>
          <div className="w-10 h-10 bg-accent-primary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-blue group cursor-pointer active:scale-95 transition-all">
            <Zap size={22} className="text-white fill-current group-hover:scale-110 transition-transform" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col animate-fade-in">
              <span className="font-display font-black text-lg text-text-primary tracking-tight leading-none">
                TaskFlow
              </span>
              <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">
                Workspace
              </span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-8 space-y-2 overflow-y-auto no-scrollbar">
          {navItems.map(({ to, icon: Icon, label, exact, authOnly }) => {
            if (authOnly && isGuest) return null;
            const isActive = exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/';
            
            return (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive: active }) =>
                  `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
                    active
                      ? 'bg-accent-primary/5 text-accent-primary'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-1/50'
                  }`
                }
              >
                <Icon size={20} className={`flex-shrink-0 transition-all duration-300 ${isActive ? 'text-accent-primary' : 'group-hover:text-text-primary group-hover:scale-110'}`} />
                {sidebarOpen && (
                  <span className={`text-xs font-bold uppercase tracking-widest transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                    {label}
                  </span>
                )}
                
                {/* Active Indicator Blade */}
                {isActive && (
                  <div className="nav-indicator -left-3 h-8 shadow-blue" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Workspace Section */}
        <div className={`p-4 mt-auto border-t border-border-subtle/50 bg-surface-1/10 transition-all ${sidebarOpen ? '' : 'flex flex-col items-center'}`}>
          {!isGuest ? (
            <div className={`flex items-center gap-3 transition-all ${sidebarOpen ? '' : 'flex-col'}`}>
              <div className="w-10 h-10 rounded-2xl bg-surface-1 border border-border-default flex items-center justify-center text-text-primary text-xs font-black flex-shrink-0 shadow-premium">
                {initials}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 animate-fade-in">
                  <p className="text-xs font-black text-text-primary truncate uppercase tracking-tight">{user?.name}</p>
                  <p className="text-[9px] text-text-muted truncate font-bold uppercase tracking-widest mt-0.5 opacity-60">System Operator</p>
                </div>
              )}
              {sidebarOpen && (
                <button
                  onClick={logout}
                  className="text-text-muted hover:text-danger transition-all p-2 rounded-xl hover:bg-danger/10 group active:scale-90"
                  title="Terminate Session"
                >
                  <LogOut size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className={`flex items-center gap-3 w-full px-4 py-3.5 bg-accent-primary text-white rounded-2xl hover:bg-accent-hover transition-all shadow-blue active:scale-95 ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              <User size={18} />
              {sidebarOpen && <span className="text-xs font-black uppercase tracking-widest">Enroll Now</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-10 h-20 bg-bg-primary/50 backdrop-blur-md border-b border-border-subtle/30 z-20">
          <div className="flex items-center gap-6">
             <div className="text-text-muted hover:text-text-primary transition-colors cursor-default">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">System Node</p>
                <p className="text-sm font-black text-text-primary tracking-tight mt-0.5">
                   {location.pathname === '/' ? 'DASHBOARD' : location.pathname.split('/')[1].toUpperCase()}
                </p>
             </div>
             <div className="h-8 w-px bg-border-subtle mx-2" />
             <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-hover:text-accent-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="COMMAND SEARCH..." 
                  className="bg-surface-1/50 border border-border-subtle rounded-xl px-12 py-2.5 text-[10px] font-black tracking-widest text-text-primary focus:border-accent-primary/40 focus:w-80 transition-all outline-none"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-border-subtle rounded text-[8px] font-bold text-text-muted">⌘K</div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
               onClick={toggleTheme}
               className="p-2.5 text-text-muted hover:text-text-primary hover:bg-surface-2 rounded-xl transition-all group active:scale-95"
               title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
             >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
             </button>
             {!isGuest && (
               <>
                 <div className="h-8 w-px bg-border-subtle mx-2" />
                 <NotificationCenter />
               </>
             )}
             <div className="h-8 w-px bg-border-subtle mx-2" />
             <button
               onClick={() => navigate('/settings')}
               className="w-10 h-10 rounded-2xl bg-surface-1 border border-border-default hover:border-accent-primary/50 transition-all flex items-center justify-center overflow-hidden active:scale-95"
             >
                <div className="text-[10px] font-black text-text-muted">{initials}</div>
             </button>
          </div>
        </header>

        {/* Mobile Header (Simplified) */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-bg-secondary border-b border-border-subtle z-30">
          <div className="flex items-center gap-3">
             <Zap size={18} className="text-accent-primary" />
             <span className="font-display font-black text-lg text-text-primary tracking-tight">TaskFlow</span>
          </div>
          <div className="flex items-center gap-4">
            {!isGuest && <NotificationCenter />}
            <div className="w-8 h-8 rounded-xl bg-surface-1 border border-border-default flex items-center justify-center text-[10px] font-black text-text-muted">
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative">
          <div className="pb-32 md:pb-10"> {/* Extra padding for Mobile BottomNav */}
            <Outlet />
          </div>
          
          {/* Subtle Ambient Accent */}
          <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[120px] pointer-events-none -mr-40 -mt-40 z-0" />
        </main>

        {/* Mobile Navigation */}
        {/* Desktop Footer Signature */}
        <footer className="hidden md:flex items-center justify-between px-10 py-3 bg-bg-primary/30 border-t border-border-subtle/20 z-10">
           <div className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] opacity-40">
              Build v2.4.1-Stable
           </div>
           <div className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
              <span>Hand-engineered with</span>
              <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
              <span>by Sri Vaishnavi</span>
           </div>
        </footer>

        <BottomNav />
      </div>
    </div>
  );
}

