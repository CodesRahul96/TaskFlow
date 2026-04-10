import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { Loader2, XCircle, CheckCircle } from "lucide-react";

export default function VerifyLogin() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const sessionId = searchParams.get("sessionId");
  const hasCalled = useRef(false);
  const { verifyLogin, validateMFA, loading } = useAuthStore();
  const [status, setStatus] = useState("verifying"); // verifying, success, error, mfa
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (token && !hasCalled.current) {
      hasCalled.current = true;
      verifyLogin(token, sessionId).then((res) => {
        if (res.success) {
          setStatus("success");
          setMessage("IDENTITY VERIFIED");
          setTimeout(() => navigate("/"), 2000);
        } else if (res.mfaRequired) {
          setStatus("mfa");
          setMfaToken(res.mfaToken);
        } else {
          setStatus("error");
          setMessage(res.message);
        }
      });
    } else if (!token) {
      setStatus("error");
      setMessage("Invalid security link.");
    }
  }, [token, sessionId, verifyLogin, navigate]);

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    const res = await validateMFA(mfaToken, mfaCode, sessionId);
    if (res.success) {
      setStatus("success");
      setMessage("MFA SYNCHRONIZED");
      setTimeout(() => navigate("/"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-primary relative overflow-hidden">
      {/* Structural Accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-accent-primary opacity-50" />
      
      <div className="max-w-md w-full bg-bg-secondary border border-border-subtle rounded-[2.5rem] p-10 text-center animate-fade-in shadow-2xl relative z-10">
        <div className="mb-8">
           <h1 className="text-2xl font-display font-black text-text-primary tracking-tight">Access Control</h1>
           <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-2">Authentication Protocol</p>
        </div>

        <div className="min-h-[200px] flex flex-col justify-center">
          {status === "verifying" ? (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 rounded-3xl bg-surface-1 border border-border-subtle flex items-center justify-center mb-6 shadow-sm">
                <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
              </div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest animate-pulse">Scanning Security Key...</p>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center animate-fade-in py-6">
              <div className="w-20 h-20 rounded-3xl bg-success/10 border border-success/20 flex items-center justify-center mb-6 shadow-sm text-success">
                 <CheckCircle className="w-10 h-10" strokeWidth={3} />
              </div>
              <p className="text-xl font-display font-black text-text-primary tracking-tight mb-2 uppercase">{message}</p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Routing to workspace...</p>
            </div>
          ) : status === "mfa" ? (
            <form onSubmit={handleMfaSubmit} className="flex flex-col items-center animate-fade-in space-y-8">
              <div className="text-center">
                 <h2 className="text-lg font-display font-black text-text-primary tracking-tight">2-Step Verification</h2>
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Cross-platform synchronization</p>
              </div>
              
              <input
                type="text"
                placeholder="000 000"
                className="input-field text-center text-3xl tracking-[0.3em] font-black h-20"
                maxLength={6}
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                required
                autoFocus
              />

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="btn-primary w-full py-4 flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[11px] shadow-blue"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Finalize Protocol"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center animate-fade-in py-6">
              <div className="w-20 h-20 rounded-3xl bg-danger/10 border border-danger/20 flex items-center justify-center mb-6 shadow-sm text-danger">
                 <XCircle className="w-10 h-10" strokeWidth={3} />
              </div>
              <p className="text-danger font-black text-[10px] uppercase tracking-widest mb-8 px-4 py-2 bg-danger/5 rounded-xl border border-danger/20">{message}</p>
              <Link to="/login" className="btn-secondary w-full py-4 font-bold uppercase tracking-widest text-[11px]">
                Back to Command Center
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-20">
         <div className="h-px w-8 bg-border-subtle" />
         <span className="text-[10px] font-black uppercase tracking-widest">Secure Entry Point</span>
         <div className="h-px w-8 bg-border-subtle" />
      </div>
    </div>
  );
}
