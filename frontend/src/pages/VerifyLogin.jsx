import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { Loader2, XCircle, CheckCircle } from "lucide-react";

export default function VerifyLogin() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const hasCalled = useRef(false);
  const { verifyLogin } = useAuthStore();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (token && !hasCalled.current) {
      hasCalled.current = true;
      verifyLogin(token).then((res) => {
        if (res.success) {
          setStatus("success");
          setMessage("Logged in successfully! Redirecting...");
          setTimeout(() => navigate("/dashboard"), 2000);
        } else {
          setStatus("error");
          setMessage(res.message);
        }
      });
    } else if (!token) {
      setStatus("error");
      setMessage("Invalid login link.");
    }
  }, [token, verifyLogin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0f1a]">
      <div className="max-w-md w-full glass-card p-8 text-center animate-fade-in">
        <h1 className="text-2xl font-bold mb-6 gradient-text">Logging you in...</h1>

        {!error ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-primary-400 animate-spin mb-4" />
            <p className="text-gray-400">Verifying your magic link, please wait...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <p className="text-gray-200 mb-6">{error}</p>
            <Link to="/login" className="btn-primary w-full py-3">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
