import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, User, ArrowRight, ShieldCheck, ShieldAlert, Lock, Wand2 } from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../store/authStore';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [registerMode, setRegisterMode] = useState('magic'); // 'password' or 'magic'
  
  const { register, registerWithPassword, googleLogin, loading } = useAuthStore();
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();

  // Real-time validation
  useEffect(() => {
    const validate = () => {
      const newErrors = {};
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email format';
      if (registerMode === 'password' && form.password && form.password.length < 6) newErrors.password = 'Must be at least 6 characters';
      setErrors(newErrors);
    };
    validate();
  }, [form, registerMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;

    if (!executeRecaptcha) {
      setErrors(f => ({ ...f, general: "reCAPTCHA not initialized yet. Please wait a moment." }));
      return;
    }

    const captchaToken = await executeRecaptcha('register');
    
    if (registerMode === 'password') {
      const result = await registerWithPassword(form.name, form.email, form.password, captchaToken);
      if (result.success) {
        setIsSubmitted(true);
      } else if (result.errors) {
        const serverErrors = {};
        result.errors.forEach(err => {
          serverErrors[err.field] = err.message;
        });
        setErrors(f => ({ ...f, ...serverErrors }));
      } else if (result.message) {
        setErrors(f => ({ ...f, general: result.message }));
      }
    } else {
      const result = await register(form.name, form.email, captchaToken);
      if (result.success) {
        setIsSubmitted(true);
      } else if (result.errors) {
        const serverErrors = {};
        result.errors.forEach(err => {
          serverErrors[err.field] = err.message;
        });
        setErrors(f => ({ ...f, ...serverErrors }));
      } else if (result.message) {
        setErrors(f => ({ ...f, general: result.message }));
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const result = await googleLogin(credentialResponse.credential);
    if (result.success) {
      navigate('/');
    }
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
          <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">Create Account</h1>
          <p className="text-text-muted mt-2 font-medium">Join the next generation of productivity</p>
        </div>

        <div className="card bg-surface-1/40 backdrop-blur-xl border-border-subtle p-8 sm:p-10 shadow-2xl">
          {isSubmitted ? (
            <div className="text-center space-y-6 py-2 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-success/10 rounded-full text-success mb-2">
                <ShieldCheck size={40} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Verify your email</h2>
                <p className="text-text-muted mt-2 leading-relaxed">
                  We've sent a verification link to <br />
                  <span className="text-text-primary font-bold">{form.email}</span>
                </p>
              </div>
              
              <div className="pt-6">
                <Link to="/login" className="w-full btn-primary py-3.5 block font-bold uppercase tracking-widest text-[11px]">
                  Return to Sign In
                </Link>
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
                  onError={() => toast.error('Google signup failed')}
                  useOneTap
                  theme="filled_blue"
                  shape="pill"
                  size="large"
                  text="signup_with"
                />
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-text-muted text-[10px] font-bold uppercase tracking-widest">or register with email</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>

              {/* Toggle Mode */}
              <div className="flex bg-surface-2 p-1 rounded-2xl mb-6">
                <button 
                  type="button"
                  onClick={() => setRegisterMode('magic')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${registerMode === 'magic' ? 'bg-surface-1 shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <Wand2 size={14} /> Magic Link
                </button>
                <button 
                  type="button"
                  onClick={() => setRegisterMode('password')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${registerMode === 'password' ? 'bg-surface-1 shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <Lock size={14} /> Password
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2.5">Full Name</label>
                  <div className="relative group">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                    <input
                      type="text"
                      className={`input-field pl-12 ${errors.name ? 'border-danger/50' : ''}`}
                      placeholder="e.g. John Doe"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  {errors.name && <p className="text-danger text-xs font-bold mt-2">{errors.name}</p>}
                </div>

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

                {registerMode === 'password' && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2.5">Create Password</label>
                    <div className="relative group">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                      <input
                        type="password"
                        className={`input-field pl-12 ${errors.password ? 'border-danger/50' : ''}`}
                        placeholder="Min. 6 characters"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        required
                      />
                    </div>
                    {errors.password && <p className="text-danger text-xs font-bold mt-2">{errors.password}</p>}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || Object.keys(errors).length > 0 || (registerMode === 'password' && !form.password)}
                  className="btn-primary w-full flex items-center justify-center gap-3 py-4 shadow-blue mt-2"
                >
                  {loading ? (
                    <Loader variant="spinner" size="sm" />
                  ) : (
                    <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px]">
                      Create Account <ArrowRight size={16} />
                    </span>
                  )}
                </button>
              </form>

              <p className="text-center text-text-muted text-sm mt-8 font-medium">
                Already have an account?{' '}
                <Link to="/login" className="text-accent-primary hover:text-accent-hover font-bold transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
