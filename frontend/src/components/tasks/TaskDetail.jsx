import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Clock, MessageSquare, Activity, ChevronDown, Edit2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import useTaskStore from '../../store/taskStore';
import useAuthStore from '../../store/authStore';
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
    <div className="flex items-center gap-2 group py-1.5">
      <button
        onClick={toggle}
        className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${
          subtask.completed
            ? 'bg-neon-green border-neon-green'
            : 'border-border-strong hover:border-accent-glow'
        }`}
      >
        {subtask.completed && <Check size={12} className="text-white" />}
      </button>

      {editing ? (
        <input
          className="flex-1 bg-transparent border-b border-accent-primary text-text-primary text-sm outline-none"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`flex-1 text-sm cursor-text ${subtask.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}
        >
          {subtask.title}
        </span>
      )}

      <button
        onClick={() => deleteSubtask(taskId, subtask._id, isGuest)}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-neon-red transition-all p-0.5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function TimeBlockItem({ block, taskId, isGuest }) {
  const { deleteTimeBlock } = useTaskStore();

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border border-border-subtle hover:border-border-default transition-all group"
      style={{ borderLeftColor: block.color, borderLeftWidth: '3px' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{block.title || 'Work session'}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {format(new Date(block.startTime), 'MMM d, h:mm a')} → {format(new Date(block.endTime), 'h:mm a')}
        </p>
        {block.notes && <p className="text-xs text-text-muted mt-1">{block.notes}</p>}
      </div>
      <button
        onClick={() => deleteTimeBlock(taskId, block._id, isGuest)}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-neon-red transition-all p-0.5 flex-shrink-0"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function AddTimeBlockForm({ taskId, onClose, isGuest }) {
  const { addTimeBlock } = useTaskStore();
  const [form, setForm] = useState({ title: '', startTime: '', endTime: '', color: '#6366f1', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await addTimeBlock(taskId, form, isGuest);
    setLoading(false);
    if (result?.success) onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-surface-1 rounded-lg border border-border-subtle space-y-3">
      <input type="text" className="input-field text-sm" placeholder="Block label (optional)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-text-muted mb-1 block">Start</label>
          <input type="datetime-local" className="input-field text-xs" required value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">End</label>
          <input type="datetime-local" className="input-field text-xs" required value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
        </div>
      </div>
      <input type="text" className="input-field text-sm" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm">
          {loading ? '...' : 'Add Block'}
        </button>
      </div>
    </form>
  );
}

export default function TaskDetail({ task, onEdit, onClose }) {
  const { addSubtask, updateTask } = useTaskStore();
  const { isGuest } = useAuthStore();
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
      { key: 'activity', label: 'Activity' },
    ] : []),
  ];

  return (
    <div className="h-full flex flex-col bg-bg-secondary border-l border-border-subtle">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-border-subtle">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`tag text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
            <span className={`tag text-xs ${STATUS_COLORS[task.status]}`}>{task.status.replace('-', ' ')}</span>
          </div>
          <h2 className="font-display font-bold text-xl text-text-primary leading-tight">{task.title}</h2>
          {task.description && (
            <p className="text-text-secondary text-sm mt-2 leading-relaxed">{task.description}</p>
          )}
          {task.deadline && (
            <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
              <Calendar size={12} />
              Due: {format(new Date(task.deadline), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onEdit} className="btn-ghost p-2">
            <Edit2 size={16} />
          </button>
          <button onClick={onClose} className="btn-ghost p-2">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="px-5 py-3 border-b border-border-subtle flex gap-2 flex-wrap">
          {task.tags.map(tag => (
            <span key={tag} className="tag bg-surface-2 text-text-secondary border border-border-subtle text-xs">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border-subtle overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-accent-glow border-b-2 border-accent-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-surface-2 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Subtasks */}
        {activeTab === 'subtasks' && (
          <div>
            {totalSubtasks > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                  <span>{completedSubtasks}/{totalSubtasks} completed</span>
                  <span>{Math.round((completedSubtasks / totalSubtasks) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neon-green rounded-full transition-all"
                    style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              {(task.subtasks || [])
                .sort((a, b) => a.order - b.order)
                .map(subtask => (
                  <SubtaskItem key={subtask._id} subtask={subtask} taskId={task._id} isGuest={isGuest} />
                ))}
            </div>

            <div className="flex gap-2 mt-3">
              <input
                type="text"
                className="input-field text-sm flex-1"
                placeholder="Add subtask..."
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
              />
              <button onClick={handleAddSubtask} className="btn-primary px-3">
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Time Blocks */}
        {activeTab === 'timeblocks' && (
          <div>
            <div className="space-y-2 mb-3">
              {(task.timeBlocks || []).length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">No time blocks scheduled</p>
              ) : (
                (task.timeBlocks || [])
                  .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                  .map(block => (
                    <TimeBlockItem key={block._id} block={block} taskId={task._id} isGuest={isGuest} />
                  ))
              )}
            </div>

            {showBlockForm ? (
              <AddTimeBlockForm taskId={task._id} onClose={() => setShowBlockForm(false)} isGuest={isGuest} />
            ) : (
              <button
                onClick={() => setShowBlockForm(true)}
                className="w-full flex items-center gap-2 justify-center py-2 border border-dashed border-border-strong text-text-muted hover:text-text-primary hover:border-accent-primary transition-all rounded-lg text-sm"
              >
                <Plus size={16} /> Schedule Time Block
              </button>
            )}
          </div>
        )}

        {/* Comments */}
        {activeTab === 'comments' && !isGuest && (
          <div>
            {loadingComments ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {comments.length === 0 ? (
                  <p className="text-text-muted text-sm text-center py-4">No comments yet</p>
                ) : (
                  comments.map(c => (
                    <div key={c._id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-accent-primary flex items-center justify-center text-white text-xs flex-shrink-0">
                        {c.author?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-text-primary">{c.author?.name}</span>
                          <span className="text-xs text-text-muted">{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                          {c.edited && <span className="text-xs text-text-muted">(edited)</span>}
                        </div>
                        <p className="text-sm text-text-secondary mt-1">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field text-sm flex-1"
                placeholder="Add a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
              />
              <button onClick={submitComment} className="btn-primary px-3">
                <MessageSquare size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Activity */}
        {activeTab === 'activity' && !isGuest && (
          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">No activity yet</p>
            ) : (
              auditLogs.map(log => (
                <div key={log._id} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity size={11} className="text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">
                      <span className="text-text-primary font-medium">{log.userName}</span>{' '}
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-text-muted">{format(new Date(log.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
