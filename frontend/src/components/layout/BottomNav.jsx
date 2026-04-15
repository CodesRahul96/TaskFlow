import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Calendar, User } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const mobileNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home', exact: true },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/calendar', icon: Calendar, label: 'Plan' },
  { to: '/settings', icon: User, label: 'Settings' },
];

export default function BottomNav() {
  const { isGuest } = useAuthStore();

  return (
    <nav className="md:hidden fixed bottom-6 left-6 right-6 z-50">
      <div className="bg-bg-secondary/80 backdrop-blur-xl border border-border-default h-16 rounded-[2rem] shadow-premium flex items-center justify-around px-2 relative overflow-hidden">
        {/* Subtle structural highlight */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        
        {mobileNavItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-2xl transition-all duration-300 relative group ${
                isActive ? 'text-accent-primary' : 'text-text-muted hover:text-text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-active:scale-90'}`} 
                />
                <span className={`text-[9px] font-black uppercase tracking-tighter transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {label}
                </span>
                
                {isActive && (
                   <div className="absolute -bottom-1 w-1 h-1 bg-accent-primary rounded-full shadow-blue animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
