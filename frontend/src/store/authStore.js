import { create } from 'zustand';
import api from '../api/client';
import toast from 'react-hot-toast';

const safeParse = (key) => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined') return null;
    return JSON.parse(item);
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const useAuthStore = create((set, get) => ({
  user:    safeParse('tf_user'),
  token:   localStorage.getItem('tf_token') === 'undefined' ? (localStorage.removeItem('tf_token'), null) : localStorage.getItem('tf_token'),
  loading: false,
  isGuest: !localStorage.getItem('tf_token') || localStorage.getItem('tf_token') === 'undefined',
  isOnline: navigator.onLine,

  setOnline: (status) => set({ isOnline: status }),

  /**
   * Orchestrates the login request.
   * Validates credentials and triggers a secure Magic Link email.
   * @param {string} email
   * @param {string} sessionId
   * @param {string} captchaToken
   */
  login: async (email, sessionId, captchaToken) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { email, sessionId, captchaToken });
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

  /**
   * Handles new account registration.
   * Initiates the identity verification workflow.
   * @param {string} name
   * @param {string} email
   * @param {string} captchaToken
   */
  register: async (name, email, captchaToken) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', { name, email, captchaToken });
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

  /**
   * Verifies the user's email address.
   * Completes the registration loop using a verification token.
   * @param {string} token
   */
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

  /**
   * Finalizes the magic link authentication.
   * Exchanges a temporary login token for a secure JWT session.
   * @param {string} token
   * @param {string} sessionId
   */
  verifyLogin: async (token, sessionId) => {
    set({ loading: true });
    try {
      const url = `/auth/verify-login?token=${token}${sessionId ? `&sessionId=${sessionId}` : ''}`;
      const { data } = await api.get(url);
      
      if (data.mfaRequired) {
        set({ loading: false });
        return { mfaRequired: true, mfaToken: data.mfaToken };
      }

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

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error("Logout error:", err);
    }
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

  // MFA Actions
  setupMFA: async () => {
    try {
      const { data } = await api.get('/auth/mfa/setup');
      return { success: true, data };
    } catch (err) {
      toast.error(err.response?.data?.message || 'MFA setup failed');
      return { success: false };
    }
  },

  verifyMFASetup: async (token) => {
    try {
      const { data } = await api.post('/auth/mfa/verify', { token });
      set((state) => ({ user: { ...state.user, mfaEnabled: true } }));
      toast.success(data.message);
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'MFA verification failed');
      return { success: false };
    }
  },

  validateMFA: async (mfaToken, code, sessionId) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/mfa/validate', { mfaToken, code, sessionId });
      localStorage.setItem('tf_token', data.token);
      localStorage.setItem('tf_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false, isGuest: false });
      toast.success('MFA verified! Welcome back.');
      return { success: true };
    } catch (err) {
      set({ loading: false });
      const msg = err.response?.data?.message || 'Invalid MFA code';
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  disableMFA: async () => {
    try {
      const { data } = await api.post('/auth/mfa/disable');
      set((state) => ({ user: { ...state.user, mfaEnabled: false } }));
      toast.success(data.message);
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'MFA disable failed');
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
