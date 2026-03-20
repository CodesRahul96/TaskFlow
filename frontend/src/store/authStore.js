import { create } from 'zustand';
import api from '../api/client';
import toast from 'react-hot-toast';

const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem('tf_user') || 'null'),
  token:   localStorage.getItem('tf_token') || null,
  loading: false,
  isGuest: !localStorage.getItem('tf_token'),
  isOnline: navigator.onLine,

  setOnline: (status) => set({ isOnline: status }),

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      set({ loading: false });
      toast.success(data.message || 'Login link sent to your email!');
      return { success: true, message: data.message };
    } catch (err) {
      set({ loading: false });
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  register: async (name, email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      set({ loading: false });
      toast.success(data.message || 'Verification email sent!');
      return { success: true, message: data.message };
    } catch (err) {
      set({ loading: false });
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  verifyEmail: async (token) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/auth/verify-email?token=${token}`);
      set({ loading: false });
      toast.success(data.message);
      return { success: true };
    } catch (err) {
      set({ loading: false });
      const msg = err.response?.data?.message || 'Verification failed';
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  verifyLogin: async (token) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/auth/verify-login?token=${token}`);
      localStorage.setItem('tf_token', data.token);
      localStorage.setItem('tf_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false, isGuest: false });
      toast.success(`Welcome back, ${data.user.name}!`);
      get()._syncGuestIfNeeded();
      return { success: true };
    } catch (err) {
      set({ loading: false });
      const msg = err.response?.data?.message || 'Login link invalid or expired';
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  logout: () => {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    set({ user: null, token: null, isGuest: true });
    toast.success('Logged out');
    window.location.href = '/login';
  },

  updateProfile: async (data) => {
    try {
      const res = await api.put('/auth/profile', data);
      const updated = res.data.user;
      localStorage.setItem('tf_user', JSON.stringify(updated));
      set({ user: updated });
      toast.success('Profile updated');
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
      return { success: false };
    }
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('tf_user', JSON.stringify(data.user));
      set({ user: data.user });
    } catch {
      get().logout();
    }
  },

  setGuestMode: () => {
    set({ isGuest: true, user: null, token: null });
  },

  // Internal: sync guest localStorage tasks after login/register
  _syncGuestIfNeeded: async () => {
    const GUEST_KEY = 'tf_guest_tasks';
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (!raw) return;
      const guestTasks = JSON.parse(raw);
      if (!Array.isArray(guestTasks) || guestTasks.length === 0) return;
      const { data } = await api.post('/tasks/sync-guest', { guestTasks });
      localStorage.removeItem(GUEST_KEY);
      if (data.syncedCount > 0) {
        toast.success(`${data.syncedCount} guest task${data.syncedCount > 1 ? 's' : ''} synced to your account!`);
      }
    } catch {
      // non-critical
    }
  },
}));

export default useAuthStore;
