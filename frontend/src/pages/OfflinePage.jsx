import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 text-center">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-accent-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-red-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md">
        <div className="mb-8 inline-flex items-center justify-center w-24 h-24 bg-surface-1 rounded-3xl border border-border-subtle shadow-lg animate-pulse">
          <WifiOff size={48} className="text-text-muted" />
        </div>
        
        <h1 className="text-4xl font-bold text-text-primary mb-4">
          You're Offline
        </h1>
        
        <p className="text-text-muted mb-8 leading-relaxed">
          It looks like your connection has been interrupted. TaskFlow needs an active connection to sync your tasks and schedule.
        </p>

        <button 
          onClick={handleRetry}
          className="btn-primary inline-flex items-center gap-2 px-8 py-3 shadow-glow"
        >
          <RefreshCw size={18} />
          Retry Connection
        </button>
        
        <p className="mt-6 text-[11px] text-text-muted/50 uppercase tracking-widest font-bold">
          Checking connectivity...
        </p>
      </div>
    </div>
  );
}
