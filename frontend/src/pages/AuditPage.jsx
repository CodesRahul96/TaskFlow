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
  task_created: 'text-neon-green',
  task_updated: 'text-neon-blue',
  task_deleted: 'text-neon-red',
  task_status_changed: 'text-neon-yellow',
  subtask_completed: 'text-neon-green',
  timeblock_added: 'text-neon-cyan',
  comment_added: 'text-neon-purple',
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

  // Group by date
  const grouped = filtered.reduce((acc, log) => {
    const date = format(new Date(log.createdAt), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-text-primary">Audit Trail</h1>
          <p className="text-text-muted text-sm mt-1">Your recent activity history</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-text-muted" />
          <select
            className="input-field text-sm py-1.5 w-full sm:w-auto"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="task_created">Task Created</option>
            <option value="task_updated">Task Updated</option>
            <option value="task_status_changed">Status Changed</option>
            <option value="subtask_completed">Subtask Completed</option>
            <option value="timeblock_added">Time Block Added</option>
            <option value="comment_added">Comment Added</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Loader key={i} variant="skeleton" className="h-16 rounded-xl" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-12">
          <Activity size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">No activity found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dateLogs]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-border-subtle" />
                  <span className="text-xs font-medium text-text-muted px-2">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </span>
                  <div className="h-px flex-1 bg-border-subtle" />
                </div>

                <div className="space-y-2">
                  {dateLogs.map(log => (
                    <div key={log._id} className="card flex items-start gap-3 hover:border-border-default transition-all">
                      <div className="text-lg flex-shrink-0 mt-0.5">{ACTION_ICONS[log.action] || '📌'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium capitalize ${ACTION_COLORS[log.action] || 'text-text-secondary'}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          {log.task?.title && (
                            <span className="text-xs text-text-muted">
                              on "{log.task.title}"
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <Clock size={10} />
                            {format(new Date(log.createdAt), 'h:mm a')}
                          </span>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <span className="text-xs text-text-muted font-mono">
                              {log.details.title || log.details.subtaskTitle || ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
