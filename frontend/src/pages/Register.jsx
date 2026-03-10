import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Loader from '../components/ui/Loader';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [strength, setStrength] = useState({ score: 0, label: 'Weak', color: 'bg-red-500' });
  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  // Real-time password strength and validation
  useEffect(() => {
    const validate = () => {
      const newErrors = {};
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email format';
      if (form.password && form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (form.password && !/\d/.test(form.password)) newErrors.password = 'Include at least one number';
      if (form.confirmPassword && form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      setErrors(newErrors);

      // Strength calculation
      let score = 0;
      if (form.password.length >= 6) score++;
      if (form.password.length >= 10) score++;
      if (/[A-Z]/.test(form.password)) score++;
      if (/\d/.test(form.password)) score++;
      if (/[^A-Za-z0-9]/.test(form.password)) score++;

      const levels = [
        { label: 'Very Weak', color: 'bg-red-500' },
        { label: 'Weak', color: 'bg-orange-500' },
        { label: 'Fair', color: 'bg-yellow-500' },
        { label: 'Good', color: 'bg-blue-500' },
        { label: 'Strong', color: 'bg-green-500' },
        { label: 'Very Strong', color: 'bg-emerald-500' }
      ];
      setStrength({ score, ...levels[score] || levels[0] });
    };
    validate();
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;
    
    const result = await register(form.name, form.email, form.password);
    if (result.success) {
      navigate('/');
    } else if (result.errors) {
      // Map server errors
      const serverErrors = {};
      result.errors.forEach(err => {
        serverErrors[err.field] = err.message;
      });
      setErrors(f => ({ ...f, ...serverErrors }));
    } else if (result.message) {
      setErrors(f => ({ ...f, general: result.message }));
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-accent-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent-primary rounded-2xl mb-4 shadow-glow">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-text-primary">Create account</h1>
          <p className="text-text-secondary mt-2">Join TaskFlow today</p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8 border border-border-default">
          {errors.general && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
              <ShieldAlert size={16} /> {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  className={`input-field pl-9 ${errors.name ? 'border-red-500/50' : ''}`}
                  placeholder="Peter Parker"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

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

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className={`input-field pl-9 pr-10 ${errors.password ? 'border-red-500/50' : ''}`}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Strength Indicator */}
              {form.password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-text-muted">Strength</span>
                    <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span>
                  </div>
                  <div className="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${strength.color}`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm Password</label>
              <div className="relative">
                <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  className={`input-field pl-9 ${errors.confirmPassword ? 'border-red-500/50' : ''}`}
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                />
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || Object.keys(errors).length > 0}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader variant="dots" />
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-glow hover:text-white transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

