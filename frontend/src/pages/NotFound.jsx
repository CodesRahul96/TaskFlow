import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 text-center">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md">
        <div className="mb-8 inline-flex items-center justify-center w-24 h-24 bg-surface-1 rounded-3xl border border-border-subtle shadow-glow animate-float">
          <Compass size={48} className="text-accent-primary" />
        </div>
        
        <h1 className="text-8xl font-black text-text-primary mb-4 tracking-tighter">
          4<span className="text-accent-primary">0</span>4
        </h1>
        
        <h2 className="text-2xl font-bold text-text-primary mb-3">
          Way off track
        </h2>
        
        <p className="text-text-muted mb-8 leading-relaxed">
          The page you're looking for has been moved or doesn't exist. Let's get you back to your schedule.
        </p>

        <Link 
          to="/" 
          className="btn-primary inline-flex items-center gap-2 px-8 py-3 shadow-glow hover:scale-105 transition-transform"
        >
          <Home size={18} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
