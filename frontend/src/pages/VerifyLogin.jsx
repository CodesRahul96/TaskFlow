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
          setMessage("Logged in successfully! Redirecting...");
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
      setMessage("Invalid login link.");
    }
  }, [token, sessionId, verifyLogin, navigate]);

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    const res = await validateMFA(mfaToken, mfaCode, sessionId);
    if (res.success) {
      setStatus("success");
      setMessage("MFA Verified! Redirecting...");
      setTimeout(() => navigate("/"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0f1a]">
      <div className="max-w-md w-full glass-card p-8 text-center animate-fade-in">
        <h1 className="text-2xl font-bold mb-6 gradient-text">Logging you in...</h1>

        {status === "verifying" ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-accent-primary animate-spin mb-4" />
            <p className="text-text-secondary">Verifying your magic link, please wait...</p>
          </div>
        ) : status === "success" ? (
          <div className="flex flex-col items-center animate-fade-in">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4 shadow-glow" />
            <p className="text-text-primary font-medium text-lg mb-2">{message}</p>
            <p className="text-text-muted text-sm">Getting things ready for you...</p>
          </div>
        ) : status === "mfa" ? (
          <form onSubmit={handleMfaSubmit} className="flex flex-col items-center animate-fade-in space-y-6">
            <CheckCircle className="w-16 h-16 text-accent-primary mb-2 opacity-50" />
            <div>
               <h2 className="text-xl font-bold text-text-primary">2-Step Verification</h2>
               <p className="text-text-muted text-sm mt-1">Enter the code from your authenticator app</p>
            </div>
            
            <input
              type="text"
              placeholder="000000"
              className="input-field text-center text-2xl tracking-[0.5em] font-mono py-4"
              maxLength={6}
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value)}
              required
              autoFocus
            />

            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Verify & Login"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center animate-fade-in">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <p className="text-red-400 font-medium mb-6">{message}</p>
            <Link to="/login" className="btn-primary w-full py-3">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
