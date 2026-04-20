import { create } from 'zustand';
import api from '../api/client';
import toast from 'react-hot-toast';

// Guest tasks stored in localStorage
const GUEST_KEY = 'tf_guest_tasks';

const getGuestTasks = () => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
  } catch { return []; }
};

const saveGuestTasks = (tasks) => {
  localStorage.setItem(GUEST_KEY, JSON.stringify(tasks));
};

const generateGuestId = () => `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// HELPER: Ensures no duplicate IDs exist in the task array (prevents React key warnings)
const deduplicateTasks = (tasks) => {
  const seen = new Set();
  return tasks.filter(task => {
    const id = (task._id || task).toString();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  selectedTask: null,
  filters: {
    status: '',
    priority: '',
    tag: '',
    search: '',
    sort: 'order',
  },

  setFilters: (filters) => set(state => ({ filters: { ...state.filters, ...filters } })),

  // ---- FETCH ----
  fetchTasks: async (isGuest = false) => {
    set({ loading: true });
    if (isGuest) {
      const guestTasks = getGuestTasks();
      set({ tasks: guestTasks, loading: false });
      return;
    }
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort) params.append('sort', filters.sort);

      const { data } = await api.get(`/tasks?${params}`);
      set({ tasks: deduplicateTasks(data.tasks), loading: false });
    } catch (err) {
      set({ loading: false });
      toast.error('Failed to fetch tasks');
    }
  },

  // ---- CREATE ----
  createTask: async (taskData, isGuest = false) => {
    if (isGuest) {
      const guestTask = {
        ...taskData,
        _id: generateGuestId(),
        status: 'todo',
        subtasks: taskData.subtasks || [],
        timeBlocks: taskData.timeBlocks || [],
        tags: taskData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isGuest: true,
      };
      const tasks = [...get().tasks, guestTask];
      saveGuestTasks(tasks);
      set({ tasks });
      toast.success('Task created!');
      return { success: true, task: guestTask };
    }
    try {
      const { data } = await api.post('/tasks', taskData);
      set(state => ({ 
        tasks: deduplicateTasks([data.task, ...state.tasks]) 
      }));
      toast.success('Task created!');
      return { success: true, task: data.task };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
      return { success: false };
    }
  },

  // ---- UPDATE ----
  updateTask: async (taskId, updates, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks.map(t =>
        t._id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );
      saveGuestTasks(tasks);
      set({ tasks });
      return { success: true };
    }
    try {
      const { data } = await api.put(`/tasks/${taskId}`, updates);
      set(state => ({
        tasks: state.tasks.map(t => t._id.toString() === taskId.toString() ? data.task : t),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? data.task : state.selectedTask,
      }));
      return { success: true, task: data.task };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
      return { success: false };
    }
  },

  reorderTasks: async (orders, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks;
      const sorted = orders.map(o => tasks.find(t => t._id.toString() === o.id.toString())).filter(Boolean);
      saveGuestTasks(sorted);
      set({ tasks: sorted });
      return;
    }
    try {
      await api.put('/tasks/reorder', { orders });
    } catch (err) {
      toast.error('Sync failed');
      get().fetchTasks(false);
    }
  },

  // ---- DELETE ----
  deleteTask: async (taskId, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks.filter(t => t._id.toString() !== taskId.toString());
      saveGuestTasks(tasks);
      set({ tasks });
      toast.success('Task deleted');
      return { success: true };
    }
    try {
      await api.delete(`/tasks/${taskId}`);
      set(state => ({
        tasks: state.tasks.filter(t => t._id.toString() !== taskId.toString()),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? null : state.selectedTask
      }));
      toast.success('Task deleted');
      return { success: true };
    } catch (err) {
      toast.error('Failed to delete task');
      return { success: false };
    }
  },

  // ---- SUBTASKS ----
  addSubtask: async (taskId, title, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks.map(t => {
        if (t._id.toString() !== taskId.toString()) return t;
        const subtask = { _id: generateGuestId(), title, completed: false, order: t.subtasks.length };
        return { ...t, subtasks: [...(t.subtasks || []), subtask] };
      });
      saveGuestTasks(tasks);
      set({ tasks });
      return { success: true };
    }
    try {
      const { data } = await api.post(`/tasks/${taskId}/subtasks`, { title });
      set(state => ({
        tasks: state.tasks.map(t => t._id.toString() === taskId.toString() ? data.task : t),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? data.task : state.selectedTask,
      }));
      return { success: true };
    } catch (err) {
      toast.error('Failed to add subtask');
      return { success: false };
    }
  },

  updateSubtask: async (taskId, subtaskId, updates, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks.map(t => {
        if (t._id !== taskId) return t;
        const subtasks = t.subtasks.map(s => s._id === subtaskId ? { ...s, ...updates } : s);
        return { ...t, subtasks };
      });
      saveGuestTasks(tasks);
      set({ tasks });
      return { success: true };
    }
    try {
      const { data } = await api.put(`/tasks/${taskId}/subtasks/${subtaskId}`, updates);
      set(state => ({
        tasks: state.tasks.map(t => t._id.toString() === taskId.toString() ? data.task : t),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? data.task : state.selectedTask,
      }));
      return { success: true };
    } catch (err) {
      toast.error('Failed to update subtask');
      return { success: false };
    }
  },

  deleteSubtask: async (taskId, subtaskId, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks.map(t => {
        if (t._id !== taskId) return t;
        return { ...t, subtasks: t.subtasks.filter(s => s._id !== subtaskId) };
      });
      saveGuestTasks(tasks);
      set({ tasks });
      return { success: true };
    }
    try {
      const { data } = await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
      set(state => ({
        tasks: state.tasks.map(t => t._id.toString() === taskId.toString() ? data.task : t),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? data.task : state.selectedTask,
      }));
      return { success: true };
    } catch (err) {
      toast.error('Failed to delete subtask');
      return { success: false };
    }
  },

  // ---- TIMEBLOCKS ----
  addTimeBlock: async (taskId, blockData, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks.map(t => {
        if (t._id !== taskId) return t;
        const block = { _id: generateGuestId(), ...blockData };
        return { ...t, timeBlocks: [...(t.timeBlocks || []), block] };
      });
      saveGuestTasks(tasks);
      set({ tasks });
      toast.success('Time block added');
      return { success: true };
    }
    try {
      const { data } = await api.post(`/tasks/${taskId}/timeblocks`, blockData);
      set(state => ({
        tasks: state.tasks.map(t => t._id.toString() === taskId.toString() ? data.task : t),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? data.task : state.selectedTask,
      }));
      toast.success('Time block added');
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add time block');
      return { success: false };
    }
  },

  updateTimeBlock: async (taskId, blockId, updates, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks.map(t => {
        if (t._id !== taskId) return t;
        const timeBlocks = t.timeBlocks.map(b => b._id === blockId ? { ...b, ...updates } : b);
        return { ...t, timeBlocks };
      });
      saveGuestTasks(tasks);
      set({ tasks });
      return { success: true };
    }
    try {
      const { data } = await api.put(`/tasks/${taskId}/timeblocks/${blockId}`, updates);
      set(state => ({
        tasks: state.tasks.map(t => t._id.toString() === taskId.toString() ? data.task : t),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? data.task : state.selectedTask,
      }));
      return { success: true };
    } catch (err) {
      toast.error('Failed to update time block');
      return { success: false };
    }
  },

  deleteTimeBlock: async (taskId, blockId, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks.map(t => {
        if (t._id !== taskId) return t;
        return { ...t, timeBlocks: t.timeBlocks.filter(b => b._id !== blockId) };
      });
      saveGuestTasks(tasks);
      set({ tasks });
      return { success: true };
    }
    try {
      const { data } = await api.delete(`/tasks/${taskId}/timeblocks/${blockId}`);
      set(state => ({
        tasks: state.tasks.map(t => t._id.toString() === taskId.toString() ? data.task : t),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? data.task : state.selectedTask,
      }));
      return { success: true };
    } catch (err) {
      toast.error('Failed to delete time block');
      return { success: false };
    }
  },

  // ---- SYNC GUEST TASKS ----
  syncGuestTasks: async () => {
    const guestTasks = getGuestTasks();
    if (guestTasks.length === 0) return;
    try {
      const { data } = await api.post('/tasks/sync-guest', { guestTasks });
      localStorage.removeItem(GUEST_KEY);
      toast.success(`Synced ${data.syncedCount} tasks from guest session`);
      set(state => ({
        tasks: deduplicateTasks([...data.tasks, ...state.tasks])
      }));
    } catch (err) {
      toast.error('Failed to sync guest tasks');
    }
  },

  // ---- SOCKET UPDATE ----
  handleSocketUpdate: (task) => {
    const taskId = task._id.toString();
    set(state => {
      // Robust Duplicate Prevention using helper
      const isSelected = state.selectedTask?._id?.toString() === taskId;
      
      return {
        tasks: deduplicateTasks([task, ...state.tasks]),
        selectedTask: isSelected ? task : state.selectedTask,
      };
    });
  },

  handleSocketDelete: (taskId) => {
    const idStr = taskId.toString();
    set(state => ({
      tasks: state.tasks.filter(t => t._id.toString() !== idStr),
      selectedTask: state.selectedTask?._id?.toString() === idStr ? null : state.selectedTask,
    }));
  },

  setSelectedTask: (task) => set({ selectedTask: task }),

  // ---- SHARING ----
  toggleSharing: async (taskId, enabled) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}/share`, { enabled });
      set(state => ({
        tasks: state.tasks.map(t => t._id.toString() === taskId.toString() ? { ...t, isSharingEnabled: data.isSharingEnabled, shareToken: data.shareToken } : t),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? { ...state.selectedTask, isSharingEnabled: data.isSharingEnabled, shareToken: data.shareToken } : state.selectedTask
      }));
      toast.success(data.message);
      return { success: true, isSharingEnabled: data.isSharingEnabled, shareToken: data.shareToken };
    } catch (err) {
      toast.error('Failed to update sharing');
      return { success: false };
    }
  },

  joinTaskByToken: async (token) => {
    try {
      const { data } = await api.post(`/tasks/join/${token}`);
      set(state => ({
        tasks: deduplicateTasks([data.task, ...state.tasks])
      }));
      toast.success(data.message);
      localStorage.removeItem('tf_pending_invite');
      return { success: true };
    } catch (err) {
      // Don't toast error if it's already joined (200 status handled in controller)
      if (err.response?.status !== 200) {
        toast.error(err.response?.data?.message || 'Failed to join task');
      }
      localStorage.removeItem('tf_pending_invite');
      return { success: false };
    }
  },
}));

export default useTaskStore;
