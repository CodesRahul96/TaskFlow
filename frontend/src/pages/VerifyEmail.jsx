import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const hasCalled = useRef(false);
  const { verifyEmail } = useAuthStore();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token && !hasCalled.current) {
      hasCalled.current = true;
      verifyEmail(token).then((res) => {
        if (res.success) {
          setStatus("success");
          setMessage("Your email has been successfully verified! You can now log in.");
        } else {
          setStatus("error");
          setMessage(res.message);
        }
      });
    } else if (!token) {
      setStatus("error");
      setMessage("No verification token found.");
    }
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0f1a]">
      <div className="max-w-md w-full glass-card p-8 text-center animate-fade-in">
        <h1 className="text-2xl font-bold mb-6 gradient-text">Email Verification</h1>

        {status === "verifying" && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-primary-400 animate-spin mb-4" />
            <p className="text-gray-400">Verifying your email, please wait...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <p className="text-gray-200 mb-6">{message}</p>
            <Link to="/login" className="btn-primary w-full py-3">
              Go to Login
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <p className="text-gray-200 mb-6">{message}</p>
            <Link to="/register" className="text-primary-400 hover:text-primary-300">
              Back to Registration
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
