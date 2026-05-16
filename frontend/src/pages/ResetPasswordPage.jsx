import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Loader from '../components/ui/Loader';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { resetPassword, loading } = useAuthStore();

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing password reset token.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const result = await resetPassword(token, form.password);
    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } else {
      setError(result.message);
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
          <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">Set New Password</h1>
          <p className="text-text-muted mt-2 font-medium">Create a strong password for your account</p>
        </div>

        <div className="card bg-surface-1/40 backdrop-blur-xl border-border-subtle p-8 sm:p-10 shadow-2xl">
          {isSuccess ? (
            <div className="text-center space-y-6 py-2 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-success/10 rounded-full text-success mb-2">
                <CheckCircle2 size={40} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Password Reset!</h2>
                <p className="text-text-muted mt-2 leading-relaxed">
                  Your password has been successfully updated. Redirecting to login...
                </p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium flex items-center gap-3">
                  <ShieldAlert size={18} /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2.5">New Password</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                    <input
                      type="password"
                      className="input-field pl-12"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required
                      disabled={!token}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2.5">Confirm Password</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                    <input
                      type="password"
                      className="input-field pl-12"
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      required
                      disabled={!token}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !token || !form.password || !form.confirmPassword}
                  className="btn-primary w-full flex items-center justify-center gap-3 py-4 shadow-blue"
                >
                  {loading ? (
                    <Loader variant="spinner" size="sm" />
                  ) : (
                    <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px]">
                      Reset Password <ArrowRight size={16} />
                    </span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
