import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, Tag, Flag, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import useTaskStore from '../../store/taskStore';
import useAuthStore from '../../store/authStore';
import api from '../../api/client';
import Loader from '../ui/Loader';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['todo', 'in-progress', 'completed', 'cancelled'];
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

export default function TaskModal({ task, onClose }) {
  const isEditing = !!task;
  const { createTask, updateTask } = useTaskStore();
  const { isGuest, token } = useAuthStore();

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo',
    deadline: task?.deadline ? format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm") : '',
    tags: task?.tags || [],
    color: task?.color || '#6366f1',
    assignedTo: task?.assignedTo?.map(u => u._id || u) || [],
  });
  const [tagInput, setTagInput] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const searchForUsers = async (q) => {
    if (!q || isGuest) return;
    try {
      const { data } = await api.get(`/users/search?q=${q}`);
      setFoundUsers(data.users);
    } catch { setFoundUsers([]); }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchForUsers(searchUsers), 300);
    return () => clearTimeout(timer);
  }, [searchUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      deadline: form.deadline || undefined,
    };

    let result;
    if (isEditing) {
      result = await updateTask(task._id, payload, isGuest);
    } else {
      result = await createTask(payload, isGuest);
    }

    setLoading(false);
    if (result?.success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-bg-secondary border-t sm:border border-border-default rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-glow-lg animate-slide-up h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 className="font-display font-bold text-lg text-text-primary">
            {isEditing ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle">
          {['details', 'assign'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-accent-glow border-b-2 border-accent-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {activeTab === 'details' && (
              <>
                {/* Title */}
                <div>
                  <input
                    type="text"
                    className="input-field text-base font-medium"
                    placeholder="Task title..."
                    value={form.title}
                    onChange={e => handleChange('title', e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <textarea
                    className="input-field resize-none"
                    placeholder="Description (optional)..."
                    rows={3}
                    value={form.description}
                    onChange={e => handleChange('description', e.target.value)}
                  />
                </div>

                {/* Priority + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5 flex items-center gap-1">
                      <Flag size={12} /> Priority
                    </label>
                    <select
                      className="input-field text-sm capitalize"
                      value={form.priority}
                      onChange={e => handleChange('priority', e.target.value)}
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p} className="capitalize">{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Status</label>
                    <select
                      className="input-field text-sm capitalize"
                      value={form.status}
                      onChange={e => handleChange('status', e.target.value)}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s} className="capitalize">{s.replace('-', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 flex items-center gap-1">
                    <Calendar size={12} /> Deadline
                  </label>
                  <input
                    type="datetime-local"
                    className="input-field text-sm"
                    value={form.deadline}
                    onChange={e => handleChange('deadline', e.target.value)}
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleChange('color', c)}
                        className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-secondary scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 flex items-center gap-1">
                    <Tag size={12} /> Tags
                  </label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {form.tags.map(tag => (
                      <span key={tag} className="tag bg-surface-2 text-text-secondary border border-border-subtle">
                        {tag}
                        <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field text-sm flex-1"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    />
                    <button type="button" onClick={addTag} className="btn-ghost px-3">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'assign' && !isGuest && (
              <div>
                <label className="block text-xs text-text-muted mb-1.5 flex items-center gap-1">
                  <Users size={12} /> Assign collaborators
                </label>
                <input
                  type="text"
                  className="input-field text-sm"
                  placeholder="Search by name or email..."
                  value={searchUsers}
                  onChange={e => setSearchUsers(e.target.value)}
                />
                {foundUsers.length > 0 && (
                  <div className="mt-2 bg-surface-1 border border-border-subtle rounded-lg overflow-hidden">
                    {foundUsers.map(u => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => {
                          if (!form.assignedTo.includes(u._id)) {
                            setForm(f => ({ ...f, assignedTo: [...f.assignedTo, u._id] }));
                          }
                          setSearchUsers('');
                          setFoundUsers([]);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 hover:bg-surface-2 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-accent-primary flex items-center justify-center text-white text-xs">
                          {u.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-text-primary">{u.name}</p>
                          <p className="text-xs text-text-muted">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {form.assignedTo.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-text-muted mb-2">Assigned ({form.assignedTo.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {form.assignedTo.map(id => (
                        <span key={id} className="tag bg-accent-primary/20 text-accent-glow border border-accent-primary/30">
                          {typeof id === 'object' ? id.name : id.slice(0, 8)}
                          <button type="button" onClick={() => setForm(f => ({ ...f, assignedTo: f.assignedTo.filter(i => i !== id) }))}>
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {isGuest && <p className="text-text-muted text-sm">Sign in to assign collaborators</p>}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-5 border-t border-border-subtle">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <Loader variant="spinner" size="sm" /> : (isEditing ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
