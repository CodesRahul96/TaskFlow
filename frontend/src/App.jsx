import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { lazy, Suspense, useEffect } from "react";
import useAuthStore from "./store/authStore";
import Layout from "./components/layout/Layout";
import { useSocket } from "./hooks/useSocket";

// Lazy Loaded Pages for performance optimization
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OfflinePage = lazy(() => import("./pages/OfflinePage"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const VerifyLogin = lazy(() => import("./pages/VerifyLogin"));

// Professional Loading Fallback
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
       <div className="w-12 h-1 h-12 border-4 border-accent-primary/20 border-t-accent-primary rounded-full animate-spin mb-4" />
       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted opacity-40">Initializing Node...</p>
    </div>
  );
}

function AppRoutes() {
  const { token, isGuest, isOnline, setOnline } = useAuthStore();
  useSocket(!!token);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  if (!isOnline) {
    return (
      <Suspense fallback={<PageLoader />}>
        <OfflinePage />
      </Suspense>
    );
  }

  const isAuth = !!token;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login"    element={!isAuth ? <Login />    : <Navigate to="/" replace />} />
        <Route path="/register" element={!isAuth ? <Register /> : <Navigate to="/" replace />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-login" element={<VerifyLogin />} />
        <Route
          path="/"
          element={isAuth || isGuest ? <Layout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="tasks"    element={<TasksPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="audit"    element={isAuth ? <AuditPage />   : <Navigate to="/login" />} />
          <Route path="profile"  element={isAuth ? <ProfilePage /> : <Navigate to="/login" />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey ? recaptchaKey : "MISSING_KEY"}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgb(var(--surface-2))",
              color: "rgb(var(--text-primary))",
              border: "1px solid rgb(var(--border-strong) / 0.1)",
              borderRadius: "16px",
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              boxShadow: "0 10px 15px -3px var(--shadow-color)",
            },
            success: { iconTheme: { primary: "rgb(var(--success))", secondary: "#fff" } },
            error:   { iconTheme: { primary: "rgb(var(--danger))", secondary: "#fff" } },
          }}
        />
      </BrowserRouter>
    </GoogleReCaptchaProvider>
  );
}

