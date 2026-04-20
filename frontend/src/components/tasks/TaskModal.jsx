import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Clock, Tag, Flag, Calendar, Users, Search, Share2, Copy, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
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
  const { createTask, updateTask, toggleSharing } = useTaskStore();
  const { isGuest, user } = useAuthStore();
  const isOwner = task?.owner === user?._id || task?.owner?._id === user?._id;

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
  const [sharing, setSharing] = useState({
    enabled: task?.isSharingEnabled || false,
    token: task?.shareToken || '',
  });

  const getShareUrl = () => {
    const base = window.location.origin;
    return `${base}/share/${sharing.token}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getShareUrl());
    toast.success('Share link copied to clipboard!');
  };

  const handleShareToggle = async () => {
    if (!isEditing || !isOwner) return;
    try {
       const result = await toggleSharing(task._id, !sharing.enabled);
       if (result.success) {
          setSharing({ enabled: result.isSharingEnabled, token: result.shareToken });
       }
    } catch (err) {
       toast.error('Failed to update sharing settings');
    }
  };

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

  const modalContent = (
    <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-bg-secondary border-t sm:border border-border-subtle rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl animate-slide-up h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-border-subtle bg-surface-1/10">
          <div>
            <h2 className="font-display font-black text-xl text-text-primary tracking-tight">
              {isEditing ? 'Edit Task' : 'Create Task'}
            </h2>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">
              {isEditing ? 'Modify existing task details' : 'Set up a new task flow'}
            </p>
          </div>
          <button onClick={onClose} className="btn-secondary p-2.5 rounded-xl transition-all text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-border-subtle bg-surface-1/5">
          {['details', 'assign', (isEditing && isOwner && 'share')].filter(Boolean).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
                activeTab === tab
                  ? 'text-accent-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-6 right-6 h-1 bg-accent-primary rounded-t-full shadow-blue" />
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 no-scrollbar">
          <div className="p-6 md:p-8 space-y-6">
            {activeTab === 'details' && (
              <>
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2.5">Title</label>
                  <input
                    type="text"
                    className="input-field text-base font-bold"
                    placeholder="What needs to be done?"
                    value={form.title}
                    onChange={e => handleChange('title', e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2.5">Description</label>
                  <textarea
                    className="input-field resize-none min-h-[100px] leading-relaxed"
                    placeholder="Add context or notes..."
                    value={form.description}
                    onChange={e => handleChange('description', e.target.value)}
                  />
                </div>

                {/* Priority + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2">
                       Priority
                    </label>
                    <select
                      className="input-field font-bold capitalize text-xs cursor-pointer"
                      value={form.priority}
                      onChange={e => handleChange('priority', e.target.value)}
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p} className="bg-bg-secondary">{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2.5">Status</label>
                    <select
                      className="input-field font-bold capitalize text-xs cursor-pointer"
                      value={form.status}
                      onChange={e => handleChange('status', e.target.value)}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s} className="bg-bg-secondary">{s.replace('-', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2">
                     Deadline
                  </label>
                  <div className="relative group">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                    <input
                      type="datetime-local"
                      className="input-field pl-12 text-xs font-bold"
                      value={form.deadline}
                      onChange={e => handleChange('deadline', e.target.value)}
                    />
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-3">Accent Color</label>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleChange('color', c)}
                        className={`w-8 h-8 rounded-xl transition-all ring-offset-2 ring-offset-bg-secondary flex-shrink-0 ${form.color === c ? 'ring-2 ring-accent-primary scale-110' : 'hover:scale-105 opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                     Tags
                  </label>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {form.tags.map(tag => (
                      <span key={tag} className="tag bg-surface-2 text-text-secondary border border-border-subtle font-bold px-3">
                        {tag}
                        <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} className="ml-1 hover:text-danger">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                      <input
                        type="text"
                        className="input-field pl-12 text-xs"
                        placeholder="Type and press enter..."
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      />
                    </div>
                    <button type="button" onClick={addTag} className="btn-secondary w-12 h-12 flex items-center justify-center p-0 rounded-xl">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'assign' && !isGuest && (
              <div className="animate-fade-in">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                   Search Collaborators
                </label>
                <div className="relative group mb-6">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                  <input
                    type="text"
                    className="input-field pl-12 text-sm"
                    placeholder="Name or email address..."
                    value={searchUsers}
                    onChange={e => setSearchUsers(e.target.value)}
                  />
                </div>

                {foundUsers.length > 0 && (
                  <div className="mt-2 bg-surface-2/40 border border-border-subtle rounded-2xl overflow-hidden animate-slide-up">
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
                        className="flex items-center gap-4 w-full px-4 py-3 hover:bg-surface-2 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-black text-sm group-hover:bg-accent-primary group-hover:text-white transition-all">
                          {u.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary uppercase tracking-tight">{u.name}</p>
                          <p className="text-xs text-text-muted font-medium">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {form.assignedTo.length > 0 && (
                  <div className="mt-8">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4">Assigned Experts ({form.assignedTo.length})</p>
                    <div className="flex flex-wrap gap-3">
                      {form.assignedTo.map(id => (
                        <span key={id} className="tag bg-accent-primary/10 text-accent-primary border border-accent-primary/20 font-bold px-4 py-2">
                          <span className="truncate max-w-[150px]">
                            {typeof id === 'object' ? id.name : id.slice(0, 12)}
                          </span>
                          <button type="button" onClick={() => setForm(f => ({ ...f, assignedTo: f.assignedTo.filter(i => i !== id) }))} className="ml-2 hover:text-danger">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {isGuest && (
                  <div className="text-center py-10 opacity-40">
                    <Users size={40} className="mx-auto mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest">Sign in to collaborate</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'share' && isEditing && isOwner && (
              <div className="animate-fade-in space-y-8 py-4 px-2">
                 <div className="flex items-center justify-between p-6 rounded-3xl bg-surface-2/40 border border-border-subtle">
                    <div className="flex items-center gap-4">
                       <div className="bg-accent-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center text-accent-primary shadow-sm border border-accent-primary/20">
                          <Share2 size={24} />
                       </div>
                       <div>
                          <h3 className="font-bold text-sm text-text-primary uppercase tracking-tight">Enable Public Sharing</h3>
                          <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest">Share this task with anyone via a secure link</p>
                       </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={sharing.enabled} 
                        onChange={handleShareToggle}
                      />
                      <div className="w-11 h-6 bg-surface-3 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
                    </label>
                 </div>

                 {sharing.enabled && sharing.token && (
                    <div className="space-y-4 animate-slide-up">
                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-3">Your Secure Share Link</label>
                        <div className="flex gap-2">
                           <div className="flex-1 bg-surface-2 border border-border-subtle rounded-2xl p-4 text-xs font-mono text-accent-primary truncate">
                              {getShareUrl()}
                           </div>
                           <button 
                             type="button"
                             onClick={copyToClipboard}
                             className="w-14 h-14 bg-accent-primary hover:bg-accent-dark text-white rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95"
                           >
                              <Copy size={20} />
                           </button>
                        </div>
                        <div className="p-5 rounded-3xl bg-accent-primary/5 border border-accent-primary/10 flex gap-4">
                           <ShieldCheck size={20} className="text-accent-primary shrink-0" />
                           <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                              Guests with this link can view the task title, description, and status. They must register to join the project as active collaborators.
                           </p>
                        </div>
                    </div>
                 )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-4 p-6 md:p-8 border-t border-border-subtle bg-surface-1/10 mt-auto">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 font-bold uppercase tracking-widest text-[11px] py-4">
              Dismiss
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 font-bold uppercase tracking-widest text-[11px] py-4 shadow-blue">
              {loading ? <Loader variant="spinner" size="sm" /> : (isEditing ? 'Confirm Changes' : 'Initialize Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

