import axios from "axios";

const api = axios.create({
  // VITE_API_URL is set in production (Vercel/Netlify env vars).
  // Falls back to "/api" for local dev — Vite proxy forwards to localhost:5000.
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tf_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("tf_token");
      localStorage.removeItem("tf_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default api;
