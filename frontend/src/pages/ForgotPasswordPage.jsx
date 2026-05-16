import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useGoogleReCaptcha, GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import useAuthStore from '../store/authStore';
import Loader from '../components/ui/Loader';

function ForgotPasswordContent() {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');
  const { forgotPassword, loading } = useAuthStore();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!executeRecaptcha) {
      setError("reCAPTCHA not initialized yet. Please wait a moment.");
      return;
    }

    const captchaToken = await executeRecaptcha('forgot_password');
    const result = await forgotPassword(email, captchaToken);
    
    if (result.success) {
      setIsSent(true);
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
          <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">Reset Password</h1>
          <p className="text-text-muted mt-2 font-medium">We'll send you a link to reset your password</p>
        </div>

        <div className="card bg-surface-1/40 backdrop-blur-xl border-border-subtle p-8 sm:p-10 shadow-2xl">
          {isSent ? (
            <div className="text-center space-y-6 py-2 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-success/10 rounded-full text-success mb-2">
                <CheckCircle2 size={40} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Check your inbox</h2>
                <p className="text-text-muted mt-2 leading-relaxed">
                  If your email is registered, you will receive a password reset link shortly.
                </p>
              </div>
              <Link to="/login" className="btn-secondary w-full py-3.5 font-bold uppercase tracking-widest text-[11px] mt-6 flex justify-center items-center gap-2">
                <ArrowLeft size={16} /> Return to Login
              </Link>
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
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2.5">Email Address</label>
                  <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                    <input
                      type="email"
                      className="input-field pl-12"
                      placeholder="name@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn-primary w-full flex items-center justify-center gap-3 py-4 shadow-blue"
                >
                  {loading ? (
                    <Loader variant="spinner" size="sm" />
                  ) : (
                    <span className="font-bold uppercase tracking-widest text-[11px]">Send Reset Link</span>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link to="/login" className="text-text-muted hover:text-text-primary text-sm font-medium inline-flex items-center gap-2 transition-colors">
                  <ArrowLeft size={16} /> Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey ? recaptchaKey : "MISSING_KEY"}>
      <ForgotPasswordContent />
    </GoogleReCaptchaProvider>
  );
}
