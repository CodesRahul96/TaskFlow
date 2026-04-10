import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Activity, Filter, Clock, User, CheckSquare } from 'lucide-react';
import api from '../api/client';
import Loader from '../components/ui/Loader';

const ACTION_ICONS = {
  task_created: '✨',
  task_updated: '✏️',
  task_deleted: '🗑️',
  task_status_changed: '🔄',
  subtask_created: '➕',
  subtask_completed: '✅',
  subtask_deleted: '❌',
  timeblock_added: '📅',
  timeblock_updated: '📝',
  timeblock_deleted: '🗑️',
  comment_added: '💬',
  comment_edited: '✏️',
  comment_deleted: '🗑️',
  collaborator_added: '👥',
  guest_sync: '🔁',
  collaborator_removed: '👤',
  task_assigned: '📋',
};

const ACTION_COLORS = {
  task_created: 'text-success',
  task_updated: 'text-accent-primary',
  task_deleted: 'text-danger',
  task_status_changed: 'text-warning',
  subtask_completed: 'text-success',
  timeblock_added: 'text-accent-primary',
  comment_added: 'text-accent-primary',
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/audit/user/me');
      setLogs(data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter
    ? logs.filter(l => l.action.includes(filter))
    : logs;

  const grouped = filtered.reduce((acc, log) => {
    const date = format(new Date(log.createdAt), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">Activity Log</h1>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-2 px-1 border-l-2 border-accent-primary">System Audit Trail</p>
        </div>
        <div className="flex items-center gap-3 bg-surface-1 p-2 rounded-2xl border border-border-subtle/50">
          <Filter size={14} className="text-text-muted ml-2" />
          <select
            className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-text-secondary outline-none cursor-pointer pr-4"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="" className="bg-bg-secondary">Filter: ALL</option>
            <option value="task_created" className="bg-bg-secondary">Task: CREATED</option>
            <option value="task_updated" className="bg-bg-secondary">Task: UPDATED</option>
            <option value="task_status_changed" className="bg-bg-secondary">Status: CHANGED</option>
            <option value="subtask_completed" className="bg-bg-secondary">Subtask: DONE</option>
            <option value="timeblock_added" className="bg-bg-secondary">Block: ADDED</option>
            <option value="comment_added" className="bg-bg-secondary">Talk: COMMENT</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-20 bg-surface-1/5 border-dashed">
          <Activity size={48} className="text-text-muted mx-auto mb-4 opacity-20" />
          <p className="text-text-muted font-bold uppercase tracking-widest text-xs">No activity footprint detected</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dateLogs]) => (
              <div key={date} className="relative">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-10 h-10 rounded-xl bg-surface-1 border border-border-subtle/50 flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-accent-primary" />
                   </div>
                   <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                     {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                   </h2>
                   <div className="flex-1 h-px bg-border-subtle/20" />
                </div>

                <div className="space-y-3 pl-2 sm:pl-14 border-l-2 border-border-subtle/10 ml-5 sm:ml-0 relative">
                  {dateLogs.map(log => (
                    <div key={log._id} className="group relative flex items-start gap-5 p-5 bg-surface-1/10 hover:bg-surface-1/30 border border-transparent hover:border-border-subtle/50 rounded-2xl transition-all active:scale-[0.99] cursor-default">
                      <div className="text-xl flex-shrink-0 pt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {ACTION_ICONS[log.action] || '📌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-[11px] font-black uppercase tracking-wider ${ACTION_COLORS[log.action] || 'text-text-secondary'}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          {log.task?.title && (
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-tight">
                              ON / {log.task.title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-[10px] font-bold text-text-muted flex items-center gap-1.5 uppercase tabular-nums">
                            <Clock size={10} className="text-accent-primary" />
                            {format(new Date(log.createdAt), 'h:mm a')}
                          </span>
                          {log.details && (log.details.title || log.details.subtaskTitle) && (
                            <span className="text-xs font-bold text-text-secondary leading-tight line-clamp-1 border-l border-border-subtle/30 pl-4">
                              {log.details.title || log.details.subtaskTitle}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all">
                         <div className="w-2 h-2 rounded-full bg-accent-primary shadow-blue" />
                      </div>
                    </div>
                  ))}
                  <div className="absolute left-[-5px] sm:left-[-17px] top-0 bottom-0 w-px bg-gradient-to-b from-border-subtle/30 via-border-subtle/10 to-transparent" />
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
