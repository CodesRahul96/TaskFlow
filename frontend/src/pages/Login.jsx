import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, ArrowRight, ShieldAlert } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '' });
  const [errors, setErrors] = useState({});
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const { login, loading, setGuestMode } = useAuthStore();
  const { emit, on, off } = useSocket(true);
  const navigate = useNavigate();

  // Real-time validation
  useEffect(() => {
    const validate = () => {
      const newErrors = {};
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email format';
      setErrors(newErrors);
    };
    validate();
  }, [form]);

  // Socket listener for auto-login
  useEffect(() => {
    if (!isMagicLinkSent) return;

    // Join room for this login session
    emit('join-room', `login:${sessionId}`);

    const handleAutoLogin = (data) => {
      // Data contains { token, user }
      localStorage.setItem('tf_token', data.token);
      localStorage.setItem('tf_user', JSON.stringify(data.user));
      
      // Update store state manually since we are bypassing the verifyLogin call
      useAuthStore.setState({ 
        user: data.user, 
        token: data.token, 
        isGuest: false 
      });

      toast.success(`Logged in automatically! Welcome, ${data.user.name}`);
      navigate('/');
    };

    on('login-success', handleAutoLogin);

    return () => {
      off('login-success', handleAutoLogin);
    };
  }, [isMagicLinkSent, sessionId, emit, on, off, navigate]);

  // Resend timer logic
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;
    
    const result = await login(form.email, sessionId);
    if (result.success) {
      setIsMagicLinkSent(true);
      setResendTimer(300); // Start 5 min cooldown
    } else if (result.errors) {
      const serverErrors = {};
      result.errors.forEach(err => {
        serverErrors[err.field] = err.message;
      });
      setErrors(f => ({ ...f, ...serverErrors }));
    } else if (result.message) {
      setErrors(f => ({ ...f, general: result.message }));
    }
  };

  const handleGuest = () => {
    setGuestMode();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Background subtle gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-1 border border-border-subtle rounded-2xl mb-6 shadow-subtle group hover:border-accent-primary/50 transition-colors">
            <Zap size={32} className="text-accent-primary fill-accent-primary/10 group-hover:scale-110 transition-transform" />
          </div>
          <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">Welcome Back</h1>
          <p className="text-text-muted mt-2 font-medium">Continue your journey with TaskFlow</p>
        </div>

        {/* Card */}
        <div className="card bg-surface-1/40 backdrop-blur-xl border-border-subtle p-8 sm:p-10 shadow-2xl">
          {isMagicLinkSent ? (
            <div className="text-center space-y-6 py-2 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-accent-primary/10 rounded-full text-accent-primary mb-2">
                <Mail size={40} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Check your inbox</h2>
                <p className="text-text-muted mt-2 leading-relaxed">
                  We've sent a magic link to <br />
                  <span className="text-text-primary font-bold">{form.email}</span>
                </p>
              </div>
              
              <div className="pt-6 space-y-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading || resendTimer > 0}
                  className="w-full btn-primary py-3.5 disabled:opacity-50 font-bold uppercase tracking-widest text-[11px]"
                >
                  {loading ? <Loader variant="spinner" size="sm" /> : 
                    resendTimer > 0 ? `Resend in ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}` : 'Resend Magic Link'}
                </button>
                <button 
                  onClick={() => setIsMagicLinkSent(false)}
                  className="text-text-muted hover:text-text-primary text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Change Email Address
                </button>
              </div>
            </div>
          ) : (
            <>
              {errors.general && (
                <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium flex items-center gap-3">
                  <ShieldAlert size={18} /> {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2.5">Email Address</label>
                  <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                    <input
                      type="email"
                      className={`input-field pl-12 ${errors.email ? 'border-danger/50' : ''}`}
                      placeholder="name@company.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  {errors.email && <p className="text-danger text-xs font-bold mt-2">{errors.email}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || Object.keys(errors).length > 0}
                  className="btn-primary w-full flex items-center justify-center gap-3 py-4 shadow-blue"
                >
                  {loading ? (
                    <Loader variant="spinner" size="sm" />
                  ) : (
                    <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px]">
                      Send Magic Link <ArrowRight size={16} />
                    </span>
                  )}
                </button>
              </form>

              <div className="mt-8 flex items-center gap-4">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>

              <button
                onClick={handleGuest}
                className="mt-8 w-full btn-secondary py-3.5 font-bold uppercase tracking-widest text-[11px]"
              >
                Continue as Guest
              </button>

              <p className="text-center text-text-muted text-sm mt-10 font-medium">
                New to TaskFlow?{' '}
                <Link to="/register" className="text-accent-primary hover:text-accent-hover font-bold transition-colors">
                  Create an account
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

