import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Clock, AlertCircle, TrendingUp, Plus, Calendar, ArrowRight, Zap } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import useAuthStore from '../store/authStore';
import useTaskStore from '../store/taskStore';

const PRIORITY_COLORS = {
  urgent: 'text-neon-red',
  high: 'text-neon-yellow',
  medium: 'text-neon-blue',
  low: 'text-neon-green',
};

const STATUS_COLORS = {
  todo: 'bg-text-muted/20 text-text-secondary',
  'in-progress': 'bg-neon-blue/20 text-neon-blue',
  completed: 'bg-neon-green/20 text-neon-green',
  cancelled: 'bg-neon-red/20 text-neon-red',
};

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card flex items-start gap-4 hover:border-border-default transition-all">
      <div className={`p-2.5 rounded-lg ${color} flex-shrink-0`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-text-muted text-sm">{label}</p>
        <p className="text-2xl font-bold text-text-primary mt-0.5">{value}</p>
        {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function getDeadlineLabel(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isPast(d) && !isToday(d)) return { label: 'Overdue', cls: 'text-neon-red' };
  if (isToday(d)) return { label: 'Today', cls: 'text-neon-yellow' };
  if (isTomorrow(d)) return { label: 'Tomorrow', cls: 'text-neon-cyan' };
  return { label: format(d, 'MMM d'), cls: 'text-text-muted' };
}

export default function Dashboard() {
  const { user, isGuest } = useAuthStore();
  const { tasks, loading, fetchTasks } = useTaskStore();

  useEffect(() => {
    fetchTasks(isGuest);
  }, [isGuest]);

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const overdue = tasks.filter(t => t.deadline && isPast(new Date(t.deadline)) && t.status !== 'completed').length;
  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

  const recentTasks = tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      return 0;
    })
    .slice(0, 8);

  const upcomingBlocks = tasks
    .flatMap(t => (t.timeBlocks || []).map(b => ({ ...b, task: t })))
    .filter(b => new Date(b.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 5);

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-text-primary">
            {isGuest ? 'Welcome to TaskFlow' : `Good ${getGreeting()}, ${user?.name?.split(' ')[0]}`}
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Link
          to="/tasks"
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus size={16} /> New Task
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-8">
        <StatCard icon={CheckSquare} label="Total Tasks" value={total} color="bg-accent-primary/20 text-accent-glow" />
        <StatCard icon={TrendingUp} label="Completed" value={completed} color="bg-neon-green/20 text-neon-green" sub={`${completionRate}% rate`} />
        <StatCard icon={Clock} label="In Progress" value={inProgress} color="bg-neon-blue/20 text-neon-blue" />
        <StatCard icon={AlertCircle} label="Overdue" value={overdue} color="bg-neon-red/20 text-neon-red" sub={urgent > 0 ? `${urgent} urgent` : undefined} />
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-secondary">Overall Progress</span>
            <span className="text-sm font-bold text-accent-glow">{completionRate}%</span>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-primary to-neon-cyan rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3">
            {[
              { label: 'Todo', count: tasks.filter(t => t.status === 'todo').length, color: 'bg-text-muted' },
              { label: 'In Progress', count: inProgress, color: 'bg-neon-blue' },
              { label: 'Completed', count: completed, color: 'bg-neon-green' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-xs text-text-muted">{label}: <strong className="text-text-secondary">{count}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Priority Tasks</h2>
            <Link to="/tasks" className="text-xs text-accent-glow hover:text-white transition-colors flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="card text-center py-12">
              <Zap size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">No tasks yet</p>
              <Link to="/tasks" className="btn-primary inline-flex items-center gap-2 mt-4">
                <Plus size={14} /> Create your first task
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.map(task => {
                const dl = getDeadlineLabel(task.deadline);
                const subtaskDone = (task.subtasks || []).filter(s => s.completed).length;
                const subtaskTotal = (task.subtasks || []).length;
                return (
                  <Link
                    key={task._id}
                    to="/tasks"
                    className="card flex items-center gap-3 hover:border-border-default transition-all cursor-pointer group"
                    style={{ borderLeftColor: task.color, borderLeftWidth: '3px' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
                        {task.priority && (
                          <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {subtaskTotal > 0 && (
                          <span className="text-xs text-text-muted">{subtaskDone}/{subtaskTotal} subtasks</span>
                        )}
                        {dl && <span className={`text-xs ${dl.cls}`}>{dl.label}</span>}
                      </div>
                    </div>
                    <span className={`tag text-xs ${STATUS_COLORS[task.status]}`}>{task.status}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming time blocks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Upcoming Blocks</h2>
            <Link to="/calendar" className="text-xs text-accent-glow hover:text-white transition-colors flex items-center gap-1">
              Calendar <ArrowRight size={12} />
            </Link>
          </div>

          {upcomingBlocks.length === 0 ? (
            <div className="card text-center py-8">
              <Calendar size={28} className="text-text-muted mx-auto mb-2" />
              <p className="text-text-muted text-sm">No upcoming blocks</p>
              <Link to="/calendar" className="text-xs text-accent-glow hover:text-white mt-2 block">
                Schedule time →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingBlocks.map(block => (
                <div
                  key={block._id}
                  className="card flex items-start gap-3 hover:border-border-default transition-all"
                  style={{ borderLeftColor: block.color || block.task.color, borderLeftWidth: '3px' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {block.title || block.task.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {format(new Date(block.startTime), 'MMM d, h:mm a')}
                    </p>
                    <p className="text-xs text-text-muted">
                      → {format(new Date(block.endTime), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
