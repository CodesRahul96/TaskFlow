import { create } from 'zustand';
import api from '../api/client';
import toast from 'react-hot-toast';

/**
 * Task Management Store (Zustand)
 * Centralized state engine for task orchestration, collaborative synchronization,
 * and high-latency mitigation via optimistic updates.
 */

const GUEST_KEY = 'tf_guest_tasks';

/**
 * Persistence Layer: Retrieves unauthenticated guest tasks from local storage.
 * @returns {Array} List of local guest tasks.
 */
const getGuestTasks = () => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
  } catch { return []; }
};

/**
 * Persistence Layer: Writes guest tasks to local storage.
 * @param {Array} tasks - Task collection to persist locally.
 */
const saveGuestTasks = (tasks) => {
  localStorage.setItem(GUEST_KEY, JSON.stringify(tasks));
};

/**
 * Utility: Generates a unique cryptographic identifier for guest tasks.
 * @returns {string} Unique guest-prefixed ID.
 */
const generateGuestId = () => `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/**
 * Integrity Helper: Ensures ID-based uniqueness across the store.
 * Prevents React key collisions and state-churn during high-frequency WebSocket updates.
 * 
 * @param {Array} tasks - Raw task collection.
 * @returns {Array} Deduplicated task collection.
 */
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

  /**
   * Updates global filtering parameters.
   */
  setFilters: (filters) => set(state => ({ filters: { ...state.filters, ...filters } })),

  /**
   * Synchronizes tasks from the remote node or local persistence.
   * Implements query-parameter orchestration for server-side filtering.
   */
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
      toast.error('Failed to synchronize workspace.');
    }
  },

  /**
   * Persists a new task node to the server or local node.
   */
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
      toast.success('Task localized.');
      return { success: true, task: guestTask };
    }
    try {
      const { data } = await api.post('/tasks', taskData);
      set(state => ({ 
        tasks: deduplicateTasks([data.task, ...state.tasks]) 
      }));
      toast.success('Task broadcasted.');
      return { success: true, task: data.task };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed.');
      return { success: false };
    }
  },

  /**
   * Synchronizes property updates for a specific task node.
   */
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
      toast.error(err.response?.data?.message || 'Sync failed.');
      return { success: false };
    }
  },

  /**
   * Handles bulk reordering for drag-and-drop orchestration.
   */
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
      toast.error('Reorder sync failed.');
      get().fetchTasks(false);
    }
  },

  /**
   * Deletes a task node or removes collaborative assignment.
   */
  deleteTask: async (taskId, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks.filter(t => t._id.toString() !== taskId.toString());
      saveGuestTasks(tasks);
      set({ tasks });
      toast.success('Local task purged.');
      return { success: true };
    }
    try {
      await api.delete(`/tasks/${taskId}`);
      set(state => ({
        tasks: state.tasks.filter(t => t._id.toString() !== taskId.toString()),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? null : state.selectedTask
      }));
      toast.success('Task node terminated.');
      return { success: true };
    } catch (err) {
      toast.error('Termination failed.');
      return { success: false };
    }
  },

  /**
   * Orchestrates subtask addition across collaboration nodes.
   */
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
      toast.error('Subtask injection failed.');
      return { success: false };
    }
  },

  /**
   * Updates subtask completion state or title.
   */
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
      toast.error('Subtask sync failed.');
      return { success: false };
    }
  },

  /**
   * Removes a subtask from the parent node.
   */
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
      toast.error('Subtask removal failed.');
      return { success: false };
    }
  },

  /**
   * Manages "Time-Block" scheduling for specific tasks.
   */
  addTimeBlock: async (taskId, blockData, isGuest = false) => {
    if (isGuest) {
      const tasks = get().tasks.map(t => {
        if (t._id !== taskId) return t;
        const block = { _id: generateGuestId(), ...blockData };
        return { ...t, timeBlocks: [...(t.timeBlocks || []), block] };
      });
      saveGuestTasks(tasks);
      set({ tasks });
      toast.success('Time slot reserved.');
      return { success: true };
    }
    try {
      const { data } = await api.post(`/tasks/${taskId}/timeblocks`, blockData);
      set(state => ({
        tasks: state.tasks.map(t => t._id.toString() === taskId.toString() ? data.task : t),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? data.task : state.selectedTask,
      }));
      toast.success('Time slot reserved.');
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scheduling collision.');
      return { success: false };
    }
  },

  /**
   * Initiates the 'Neural Lift' sync to migrate guest data to the cloud.
   */
  syncGuestTasks: async () => {
    const guestTasks = getGuestTasks();
    if (guestTasks.length === 0) return;
    try {
      const { data } = await api.post('/tasks/sync-guest', { guestTasks });
      localStorage.removeItem(GUEST_KEY);
      toast.success(`Synchronized ${data.syncedCount} nodes to cloud vault.`);
      set(state => ({
        tasks: deduplicateTasks([...data.tasks, ...state.tasks])
      }));
    } catch (err) {
      toast.error('Neural Lift synchronization failed.');
    }
  },

  /**
   * Logic: Reconciles incoming WebSocket broadcasts into the local state.
   * Utilizes the deduplication engine to ensure zero-redundancy updates.
   */
  handleSocketUpdate: (task) => {
    const taskId = task._id.toString();
    set(state => {
      const isSelected = state.selectedTask?._id?.toString() === taskId;
      return {
        tasks: deduplicateTasks([task, ...state.tasks]),
        selectedTask: isSelected ? task : state.selectedTask,
      };
    });
  },

  /**
   * Logic: Removes a terminated task node received via WebSocket.
   */
  handleSocketDelete: (taskId) => {
    const idStr = taskId.toString();
    set(state => ({
      tasks: state.tasks.filter(t => t._id.toString() !== idStr),
      selectedTask: state.selectedTask?._id?.toString() === idStr ? null : state.selectedTask,
    }));
  },

  setSelectedTask: (task) => set({ selectedTask: task }),

  /**
   * Toggles public sharing availability for a task node.
   */
  toggleSharing: async (taskId, enabled) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}/share`, { enabled });
      set(state => ({
        tasks: state.tasks.map(t => t._id.toString() === taskId.toString() ? { ...t, isSharingEnabled: data.isSharingEnabled, shareToken: data.shareToken } : t),
        selectedTask: state.selectedTask?._id?.toString() === taskId.toString() ? { ...state.selectedTask, isSharingEnabled: data.isSharingEnabled, shareToken: data.shareToken } : state.selectedTask
      }));
      toast.success('Sharing node updated.');
      return { success: true, isSharingEnabled: data.isSharingEnabled, shareToken: data.shareToken };
    } catch (err) {
      toast.error('Sharing update failed.');
      return { success: false };
    }
  },

  /**
   * Finalizes the collaborative join handshake via secure token.
   */
  joinTaskByToken: async (token) => {
    try {
      const { data } = await api.post(`/tasks/join/${token}`);
      set(state => ({
        tasks: deduplicateTasks([data.task, ...state.tasks])
      }));
      toast.success('Collaborative join successful.');
      localStorage.removeItem('tf_pending_invite');
      return { success: true };
    } catch (err) {
      if (err.response?.status !== 200) {
        toast.error(err.response?.data?.message || 'Join protocol failed.');
      }
      localStorage.removeItem('tf_pending_invite');
      return { success: false };
    }
  },
}));

export default useTaskStore;
