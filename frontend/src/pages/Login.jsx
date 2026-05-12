import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, ArrowRight, ShieldAlert, Lock, Wand2 } from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [loginMode, setLoginMode] = useState('magic'); // 'password' or 'magic'
  const [sessionId] = useState(() => crypto.randomUUID());
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  
  const { login, loginWithPassword, googleLogin, validateMFA, loading, setGuestMode } = useAuthStore();
  const { emit, on, off } = useSocket(true);
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();

  // Real-time validation
  useEffect(() => {
    const validate = () => {
      const newErrors = {};
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email format';
      setErrors(newErrors);
    };
    validate();
  }, [form]);

  // Socket listener for auto-login (Magic Link)
  useEffect(() => {
    if (!isMagicLinkSent) return;

    emit('join-room', `login:${sessionId}`);

    const handleAutoLogin = (data) => {
      localStorage.setItem('tf_token', data.token);
      localStorage.setItem('tf_user', JSON.stringify(data.user));
      
      useAuthStore.setState({ 
        user: data.user, 
        token: data.token, 
        isGuest: false 
      });

      toast.success(`Logged in automatically! Welcome, ${data.user.name}`);
      navigate('/');
    };

    on('login-success', handleAutoLogin);
    return () => off('login-success', handleAutoLogin);
  }, [isMagicLinkSent, sessionId, emit, on, off, navigate]);

  // Resend timer logic
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;

    if (!executeRecaptcha) {
      setErrors(f => ({ ...f, general: "reCAPTCHA not initialized yet. Please wait a moment." }));
      return;
    }

    const captchaToken = await executeRecaptcha('login');
    
    if (loginMode === 'password') {
      const result = await loginWithPassword(form.email, form.password, captchaToken, sessionId);
      if (result.success) {
        navigate('/');
      } else if (result.mfaRequired) {
        setMfaToken(result.mfaToken);
        setShowMfaModal(true);
      } else if (result.message) {
        setErrors(f => ({ ...f, general: result.message }));
      }
    } else {
      const result = await login(form.email, sessionId, captchaToken);
      if (result.success) {
        setIsMagicLinkSent(true);
        setResendTimer(300); // 5 min cooldown
      } else if (result.message) {
        setErrors(f => ({ ...f, general: result.message }));
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const result = await googleLogin(credentialResponse.credential, sessionId);
    if (result.success) {
      navigate('/');
    } else if (result.mfaRequired) {
      setMfaToken(result.mfaToken);
      setShowMfaModal(true);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    const result = await validateMFA(mfaToken, mfaCode, sessionId);
    if (result.success) {
      setShowMfaModal(false);
      navigate('/');
    }
  };

  const handleGuest = () => {
    setGuestMode();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="w-full max-w-md relative animate-fade-in my-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-1 border border-border-subtle rounded-2xl mb-6 shadow-subtle group hover:border-accent-primary/50 transition-colors">
            <Zap size={32} className="text-accent-primary fill-accent-primary/10 group-hover:scale-110 transition-transform" />
          </div>
          <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">Welcome Back</h1>
          <p className="text-text-muted mt-2 font-medium">Continue your journey with TaskFlow</p>
        </div>

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

              <div className="mb-8 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google login failed')}
                  useOneTap
                  theme="filled_blue"
                  shape="pill"
                  size="large"
                />
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-widest">or continue with email</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>

              {/* Toggle Mode */}
              <div className="flex bg-surface-2 p-1 rounded-2xl mb-6">
                <button 
                  type="button"
                  onClick={() => setLoginMode('magic')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${loginMode === 'magic' ? 'bg-surface-1 shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <Wand2 size={14} /> Magic Link
                </button>
                <button 
                  type="button"
                  onClick={() => setLoginMode('password')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${loginMode === 'password' ? 'bg-surface-1 shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <Lock size={14} /> Password
                </button>
              </div>

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

                {loginMode === 'password' && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2.5">Password</label>
                    <div className="relative group">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                      <input
                        type="password"
                        className="input-field pl-12"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || Object.keys(errors).length > 0 || (loginMode === 'password' && !form.password)}
                  className="btn-primary w-full flex items-center justify-center gap-3 py-4 shadow-blue"
                >
                  {loading ? (
                    <Loader variant="spinner" size="sm" />
                  ) : (
                    <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px]">
                      {loginMode === 'password' ? 'Sign In' : 'Send Magic Link'} <ArrowRight size={16} />
                    </span>
                  )}
                </button>
              </form>

              <button
                onClick={handleGuest}
                className="mt-6 w-full btn-secondary py-3.5 font-bold uppercase tracking-widest text-[11px]"
              >
                Continue as Guest
              </button>

              <p className="text-center text-text-muted text-sm mt-8 font-medium">
                New to TaskFlow?{' '}
                <Link to="/register" className="text-accent-primary hover:text-accent-hover font-bold transition-colors">
                  Create an account
                </Link>
              </p>
            </>
          )}
        </div>

        {showMfaModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-surface-1 border border-border-subtle rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-accent-primary/10 rounded-full text-accent-primary mb-4">
                  <Lock size={24} />
                </div>
                <h2 className="text-2xl font-bold text-text-primary">MFA Verification</h2>
                <p className="text-text-muted mt-2 text-sm">Enter the 6-digit code from your authenticator app.</p>
              </div>

              <form onSubmit={handleMfaSubmit} className="space-y-6">
                <div>
                  <input
                    type="text"
                    className="input-field text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowMfaModal(false)}
                    className="flex-1 btn-secondary py-3 font-bold uppercase tracking-widest text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || mfaCode.length !== 6}
                    className="flex-1 btn-primary py-3 font-bold uppercase tracking-widest text-[11px]"
                  >
                    {loading ? <Loader variant="spinner" size="sm" /> : 'Verify'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
