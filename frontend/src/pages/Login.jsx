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
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent-primary rounded-2xl mb-4 shadow-glow">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-text-primary">Welcome back</h1>
          <p className="text-text-secondary mt-2">Sign in to TaskFlow</p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-6 sm:p-8 border border-border-default">
          {isMagicLinkSent ? (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-primary/10 rounded-full text-accent-primary mb-2">
                <Mail size={32} />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Check your email</h2>
              <p className="text-text-secondary">
                We've sent a magic login link to <span className="text-text-primary font-medium">{form.email}</span>.
              </p>
              <p className="text-text-muted text-sm px-4">
                The link will expire in 5 minutes. Please click it to sign in to your dashboard.
              </p>
              <div className="pt-4 space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading || resendTimer > 0}
                  className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
                >
                  {loading ? <Loader variant="spinner" size="sm" /> : 
                    resendTimer > 0 ? `Resend available in ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}` : 'Resend Magic Link'}
                </button>
                <button 
                  onClick={() => setIsMagicLinkSent(false)}
                  className="text-text-muted hover:text-text-primary text-sm font-medium transition-colors"
                >
                  Back to login form
                </button>
              </div>
            </div>
          ) : (
            <>
              {errors.general && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
                  <ShieldAlert size={16} /> {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      className={`input-field pl-9 ${errors.email ? 'border-red-500/50' : ''}`}
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>


                <button
                  type="submit"
                  disabled={loading || Object.keys(errors).length > 0}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader variant="spinner" size="sm" />
                  ) : (
                    <>Sign In <ArrowRight size={16} /></>
                  )}
                </button>
              </form>

              <div className="mt-4 flex items-center gap-3">
                <hr className="flex-1 border-border-subtle" />
                <span className="text-text-muted text-xs">or</span>
                <hr className="flex-1 border-border-subtle" />
              </div>

              <button
                onClick={handleGuest}
                className="mt-4 w-full px-4 py-3 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong hover:bg-surface-1 transition-all text-sm font-medium"
              >
                Continue as Guest
              </button>

              <p className="text-center text-text-muted text-sm mt-6">
                Don't have an account?{' '}
                <Link to="/register" className="text-accent-glow hover:text-white transition-colors font-medium">
                  Sign up
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

