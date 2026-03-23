import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, User, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Loader from '../components/ui/Loader';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  // Real-time password strength and validation
  useEffect(() => {
    const validate = () => {
      const newErrors = {};
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email format';
      setErrors(newErrors);
    };
    validate();
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;
    
    const result = await register(form.name, form.email);
    if (result.success) {
      setIsSubmitted(true);
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
          {isSubmitted ? (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full text-green-500 mb-2">
                <Mail size={32} />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Check your email</h2>
              <p className="text-text-secondary">
                We've sent a verification link to <span className="text-text-primary font-medium">{form.email}</span>.
              </p>
              <p className="text-text-muted text-sm px-4">
                Please click the link in the email to verify your account. Once verified, you can log in.
              </p>
              <div className="pt-4">
                <Link to="/login" className="btn-primary w-full py-3 block">
                  Go to Login
                </Link>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

