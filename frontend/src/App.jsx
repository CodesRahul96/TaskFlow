import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthStore from "./store/authStore";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TasksPage from "./pages/TasksPage";
import CalendarPage from "./pages/CalendarPage";
import AuditPage from "./pages/AuditPage";
import ProfilePage from "./pages/ProfilePage";
import { useSocket } from "./hooks/useSocket";

function AppRoutes() {
  const { token, isGuest } = useAuthStore();
  useSocket(!!token);
  const isAuth = !!token;

  return (
    <Routes>
      <Route path="/login"    element={!isAuth ? <Login />    : <Navigate to="/" replace />} />
      <Route path="/register" element={!isAuth ? <Register /> : <Navigate to="/" replace />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e1e35",
            color: "#f1f0ff",
            border: "1px solid #3d3d60",
            borderRadius: "10px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
    </BrowserRouter>
  );
}
