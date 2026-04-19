import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Clock, MessageSquare, Activity, ChevronDown, Edit2, Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import useTaskStore from '../../store/taskStore';
import useAuthStore from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import CollaboratorPicker from './CollaboratorPicker';
import api from '../../api/client';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = {
  urgent: 'priority-urgent',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

const STATUS_COLORS = {
  todo: 'status-todo',
  'in-progress': 'status-in-progress',
  completed: 'status-completed',
  cancelled: 'status-cancelled',
};

function SubtaskItem({ subtask, taskId, isGuest }) {
  const { updateSubtask, deleteSubtask } = useTaskStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);

  const toggle = () => updateSubtask(taskId, subtask._id, { completed: !subtask.completed }, isGuest);
  const save = async () => {
    if (title.trim() && title !== subtask.title) {
      await updateSubtask(taskId, subtask._id, { title }, isGuest);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 group py-2 px-1 rounded-lg hover:bg-surface-2 transition-colors">
      <button
        onClick={toggle}
        className={`w-5 h-5 rounded-md flex items-center justify-center border-2 flex-shrink-0 transition-all ${
          subtask.completed
            ? 'bg-success border-success'
            : 'border-border-strong group-hover:border-accent-primary'
        }`}
      >
        {subtask.completed && <Check size={12} className="text-white" strokeWidth={3} />}
      </button>

      {editing ? (
        <input
          className="flex-1 bg-transparent border-b border-accent-primary text-text-primary text-sm outline-none font-medium"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`flex-1 text-sm cursor-text font-medium ${subtask.completed ? 'line-through text-text-muted' : 'text-text-primary group-hover:text-accent-primary'}`}
        >
          {subtask.title}
        </span>
      )}

      <button
        onClick={() => deleteSubtask(taskId, subtask._id, isGuest)}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all p-1 hover:bg-danger/10 rounded-md"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function TimeBlockItem({ block, taskId, isGuest }) {
  const { deleteTimeBlock } = useTaskStore();

  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl border border-border-subtle hover:border-border-default transition-all group relative overflow-hidden"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: block.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary">{block.title || 'Work session'}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Clock size={12} className="text-text-muted" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {format(new Date(block.startTime), 'MMM d, h:mm a')} — {format(new Date(block.endTime), 'h:mm a')}
          </p>
        </div>
        {block.notes && <p className="text-xs text-text-secondary mt-2 leading-relaxed italic opacity-80">{block.notes}</p>}
      </div>
      <button
        onClick={() => deleteTimeBlock(taskId, block._id, isGuest)}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all p-1.5 hover:bg-danger/10 rounded-lg flex-shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function AddTimeBlockForm({ taskId, onClose, isGuest }) {
  const { addTimeBlock } = useTaskStore();
  const [form, setForm] = useState({ title: '', startTime: '', endTime: '', color: '#3B82F6', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await addTimeBlock(taskId, form, isGuest);
    setLoading(false);
    if (result?.success) onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 bg-surface-2/50 rounded-xl border border-border-subtle space-y-4 animate-slide-up">
      <input type="text" className="input-field" placeholder="Session Label (e.g. Deep Work)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Start Time</label>
          <input type="datetime-local" className="input-field text-xs" required value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">End Time</label>
          <input type="datetime-local" className="input-field text-xs" required value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
        </div>
      </div>
      <textarea className="input-field min-h-[80px]" placeholder="Optional notes about this session..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Adding...' : 'Add Block'}
        </button>
      </div>
    </form>
  );
}

export default function TaskDetail({ task, onEdit, onClose }) {
  const { addSubtask, updateTask, tasks } = useTaskStore();
  const { isGuest, user } = useAuthStore();
  const socket = useSocket();
  const [newSubtask, setNewSubtask] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('subtasks');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    if (!isGuest && activeTab === 'comments') fetchComments();
    if (!isGuest && activeTab === 'activity') fetchAudit();
  }, [activeTab, task._id, isGuest]);

  useEffect(() => {
    if (isGuest) return;
    
    socket.joinTask(task._id);

    const handleNewComment = ({ comment }) => {
      // Only add if it belongs to this task (sanity check)
      if (comment.task === task._id) {
        setComments(prev => {
          // Prevent duplicates
          if (prev.some(c => c._id === comment._id)) return prev;
          return [...prev, comment];
        });
      }
    };

    socket.on('comment-added', handleNewComment);

    return () => {
      socket.leaveTask(task._id);
      socket.off('comment-added', handleNewComment);
    };
  }, [task._id, isGuest]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data } = await api.get(`/comments/${task._id}`);
      setComments(data.comments);
    } catch { }
    setLoadingComments(false);
  };

  const fetchAudit = async () => {
    try {
      const { data } = await api.get(`/audit/${task._id}`);
      setAuditLogs(data.logs);
    } catch { }
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    try {
      const { data } = await api.post(`/comments/${task._id}`, { content: newComment });
      setComments(c => [...c, data.comment]);
      setNewComment('');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    await addSubtask(task._id, newSubtask.trim(), isGuest);
    setNewSubtask('');
  };

  const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length;
  const totalSubtasks = (task.subtasks || []).length;

  const tabs = [
    { key: 'subtasks', label: 'Subtasks', count: totalSubtasks },
    { key: 'timeblocks', label: 'Schedule', count: (task.timeBlocks || []).length },
    ...(!isGuest ? [
      { key: 'comments', label: 'Comments', count: comments.length },
      { key: 'team', label: 'Team', count: (task.assignedTo || []).length },
      { key: 'activity', label: 'Activity' },
    ] : []),
  ];

  const isOwner = task.owner?._id === user?._id || task.owner === user?._id;

  const handleAddCollaborator = async (collaborator) => {
    const current = (task.assignedTo || []).map(u => u._id || u);
    if (current.includes(collaborator._id)) return;
    
    const updatedAssignedTo = [...current, collaborator._id];
    const res = await updateTask(task._id, { assignedTo: updatedAssignedTo }, isGuest);
    if (res.success) {
      toast.success(`${collaborator.name} joined the mission`);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    const updatedAssignedTo = (task.assignedTo || []).filter(u => (u._id || u) !== userId).map(u => u._id || u);
    const res = await updateTask(task._id, { assignedTo: updatedAssignedTo }, isGuest);
    if (res.success) {
      toast.success('Collaborator removed');
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-secondary border-l border-border-subtle animate-fade-in shadow-2xl">
      {/* Header */}
      <div className="flex flex-col p-6 md:p-8 border-b border-border-subtle bg-surface-1/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className={`tag ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
            <span className={`tag ${STATUS_COLORS[task.status]}`}>{task.status.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onEdit} className="btn-secondary p-2.5 rounded-xl transition-all" title="Edit">
              <Edit2 size={18} />
            </button>
            <button onClick={onClose} className="btn-secondary p-2.5 rounded-xl transition-all text-text-muted hover:text-text-primary" title="Close">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <h2 className="font-display font-black text-2xl text-text-primary leading-tight tracking-tight mb-3">
          {task.title}
        </h2>
        
        {task.description && (
          <p className="text-text-secondary text-sm leading-relaxed mb-4 max-w-lg">{task.description}</p>
        )}
        
        <div className="flex items-center gap-6 mt-2">
          {task.deadline && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-accent-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-widest leading-none mb-1">Deadline</span>
                <span className="text-xs font-bold text-text-secondary">{format(new Date(task.deadline), 'MMM d, h:mm a')}</span>
              </div>
            </div>
          )}
          {task.category && (
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-accent-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-widest leading-none mb-1">Category</span>
                <span className="text-xs font-bold text-text-secondary">{task.category}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="px-6 py-4 flex gap-2 flex-wrap bg-surface-1/5">
          {task.tags.map(tag => (
            <span key={tag} className="px-2.5 py-1 bg-surface-2 text-text-secondary rounded-lg text-[10px] font-bold uppercase tracking-wider border border-border-subtle">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-2 border-b border-border-subtle overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all relative ${
              activeTab === tab.key
                ? 'text-accent-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-accent-primary/10 text-accent-primary rounded-lg">{tab.count}</span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-5 right-5 h-1 bg-accent-primary rounded-t-full shadow-blue" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
        {/* Subtasks */}
        {activeTab === 'subtasks' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Breakdown</h3>
              <span className="text-xs font-bold text-accent-primary">
                {completedSubtasks}/{totalSubtasks} DONE
              </span>
            </div>

            {totalSubtasks > 0 && (
              <div className="mb-6">
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-primary rounded-full transition-all duration-700 shadow-blue"
                    style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              {(task.subtasks || [])
                .sort((a, b) => a.order - b.order)
                .map(subtask => (
                  <SubtaskItem key={subtask._id} subtask={subtask} taskId={task._id} isGuest={isGuest} />
                ))}
            </div>

            <div className="flex gap-3 mt-6">
              <input
                type="text"
                className="input-field text-sm flex-1 font-medium"
                placeholder="Next action item..."
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
              />
              <button 
                onClick={handleAddSubtask} 
                className="btn-primary w-11 h-11 flex items-center justify-center p-0 rounded-xl flex-shrink-0"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        {/* Time Blocks */}
        {activeTab === 'timeblocks' && (
          <div className="animate-fade-in">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-4">Scheduled Sessions</h3>
            <div className="space-y-3 mb-6">
              {(task.timeBlocks || []).length === 0 ? (
                <div className="card text-center py-10 bg-surface-1/30 border-dashed">
                   <Clock size={32} className="text-text-muted mx-auto mb-3 opacity-20" />
                   <p className="text-text-muted text-xs font-bold uppercase tracking-widest">No blocks scheduled</p>
                </div>
              ) : (
                (task.timeBlocks || [])
                  .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                  .map(block => (
                    <TimeBlockItem key={block._id} block={block} taskId={task._id} isGuest={isGuest} />
                  ))
              )}
            </div>

            {!showBlockForm ? (
              <button
                onClick={() => setShowBlockForm(true)}
                className="w-full btn-secondary flex items-center gap-2 justify-center py-4 border-dashed font-bold uppercase tracking-widest text-[10px]"
              >
                <Plus size={16} /> Schedule Session
              </button>
            ) : (
              <AddTimeBlockForm taskId={task._id} onClose={() => setShowBlockForm(false)} isGuest={isGuest} />
            )}
          </div>
        )}
        
        {/* Team */}
        {activeTab === 'team' && !isGuest && (
          <CollaboratorPicker 
            currentCollaborators={task.assignedTo || []}
            onAdd={handleAddCollaborator}
            onRemove={handleRemoveCollaborator}
            isOwner={isOwner}
          />
        )}

        {/* Comments */}
        {activeTab === 'comments' && !isGuest && (
          <div className="animate-fade-in flex flex-col h-full">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-6">Discussion</h3>
            <div className="flex-1 space-y-6 mb-8 overflow-y-visible">
              {loadingComments ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
                </div>
              ) : comments.length === 0 ? (
                <div className="card text-center py-10 bg-surface-1/30 border-dashed">
                  <MessageSquare size={32} className="text-text-muted mx-auto mb-3 opacity-20" />
                  <p className="text-text-muted text-xs font-bold uppercase tracking-widest">No comments</p>
                </div>
              ) : (
                comments.map(c => (
                  <div key={c._id} className="flex gap-4 group">
                    <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-accent-primary font-black text-xs flex-shrink-0">
                      {c.author?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary uppercase tracking-tight">{c.author?.name}</span>
                        <span className="text-[10px] font-bold text-text-muted uppercase">{format(new Date(c.createdAt), 'h:mm a')}</span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1.5 leading-relaxed bg-surface-2/40 p-3 rounded-xl rounded-tl-none border border-border-subtle/50">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-3 sticky bottom-0 bg-bg-secondary pt-4">
              <input
                type="text"
                className="input-field text-sm flex-1"
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
              />
              <button onClick={submitComment} className="btn-primary w-11 h-11 flex items-center justify-center p-0 rounded-xl flex-shrink-0">
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        {/* Activity */}
        {activeTab === 'activity' && !isGuest && (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-6">Activity Log</h3>
            {auditLogs.length === 0 ? (
              <div className="text-center py-10 opacity-30">
                <Activity size={32} className="mx-auto mb-2" />
                <p className="text-xs font-bold uppercase italic">Silence in the logs...</p>
              </div>
            ) : (
              <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-[17px] before:w-px before:bg-border-subtle">
                {auditLogs.map(log => (
                  <div key={log._id} className="flex items-start gap-4 relative">
                    <div className="w-9 h-9 rounded-full bg-surface-1 border border-border-subtle flex items-center justify-center flex-shrink-0 z-10 shadow-sm">
                      <Activity size={12} className="text-accent-primary" />
                    </div>
                    <div className="flex-1 pt-1.5">
                      <p className="text-xs font-medium text-text-secondary leading-normal">
                        <span className="text-text-primary font-bold">{log.userName}</span>{' '}
                        <span className="text-accent-primary uppercase text-[10px] font-black tracking-widest">{log.action.replace(/_/g, ' ')}</span>
                      </p>
                      <p className="text-[10px] font-bold text-text-muted mt-1 uppercase tracking-tighter">
                        {format(new Date(log.createdAt), 'MMM d • h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
