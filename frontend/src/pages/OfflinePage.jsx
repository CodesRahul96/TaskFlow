import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
      {/* Structural Accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-accent-primary opacity-50" />
      
      <div className="relative z-10 max-w-lg">
        <div className="mb-10 inline-flex items-center justify-center w-32 h-32 bg-surface-1/50 rounded-[2.5rem] border border-border-subtle shadow-2xl animate-pulse backdrop-blur-sm">
          <WifiOff size={64} className="text-text-muted opacity-50" />
        </div>
        
        <h1 className="text-[12rem] font-black text-text-primary mb-0 tracking-tighter leading-none opacity-10 absolute -top-20 left-1/2 -translate-x-1/2 select-none pointer-events-none">
          OFFLINE
        </h1>
        
        <h2 className="text-4xl font-display font-black text-text-primary mb-4 tracking-tight relative">
          Connection <span className="text-danger">Severed</span>
        </h2>
        
        <p className="text-text-muted mb-10 text-sm font-bold uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed border-y border-border-subtle/30 py-4">
          TaskFlow requires an active synchronization link to persist your schedule.
        </p>

        <button 
          onClick={handleRetry}
          className="btn-primary inline-flex items-center gap-3 px-10 py-4 shadow-blue active:scale-95 transition-all font-bold uppercase tracking-widest text-[11px]"
        >
          <RefreshCw size={18} strokeWidth={3} className="animate-spin-slow" />
          Reconnect Protocol
        </button>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-20">
         <div className="h-px w-8 bg-border-subtle" />
         <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Signal</span>
         <div className="h-px w-8 bg-border-subtle" />
      </div>
    </div>
  );
}
