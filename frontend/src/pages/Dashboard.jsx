import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckSquare, Clock, AlertCircle, TrendingUp, Plus, Calendar, ArrowRight, Zap } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import useAuthStore from '../store/authStore';
import useTaskStore from '../store/taskStore';
import Loader from '../components/ui/Loader';
import TaskModal from '../components/tasks/TaskModal';

const PRIORITY_COLORS = {
  urgent: 'text-danger',
  high: 'text-warning',
  medium: 'text-accent-primary',
  low: 'text-success',
};

const STATUS_COLORS = {
  todo: 'status-todo',
  'in-progress': 'status-in-progress',
  completed: 'status-completed',
  cancelled: 'status-cancelled',
};

function StatCard({ icon: Icon, label, value, color, sub, trend }) {
  return (
    <div className="card card-hover flex flex-col gap-4 group relative overflow-hidden">
      <div className="flex items-center justify-between z-10">
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        {trend && (
           <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${trend.startsWith('+') ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {trend.startsWith('+') ? <TrendingUp size={10} /> : <Zap size={10} className="rotate-180" />}
              {trend}
           </div>
        )}
      </div>
      <div className="z-10 mt-2">
        <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-3xl font-display font-black text-text-primary tracking-tight">{value}</p>
          {sub && <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{sub}</span>}
        </div>
      </div>
      
      {/* Decorative background element */}
      <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-5 transition-all duration-700 group-hover:scale-150 group-hover:opacity-10 ${color.split(' ')[0]}`} />
    </div>
  );
}

function getDeadlineLabel(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isPast(d) && !isToday(d)) return { label: 'CRITICAL', cls: 'priority-urgent' };
  if (isToday(d)) return { label: 'DUE TODAY', cls: 'priority-high' };
  if (isTomorrow(d)) return { label: 'UPCOMING', cls: 'priority-medium' };
  return { label: format(d, 'MMM d').toUpperCase(), cls: 'status-todo' };
}

export default function Dashboard() {
  const { user, isGuest } = useAuthStore();
  const { tasks, loading, fetchTasks } = useTaskStore();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

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
    .slice(0, 5);

  const upcomingBlocks = tasks
    .flatMap(t => (t.timeBlocks || []).map(b => ({ ...b, task: t })))
    .filter(b => new Date(b.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 4);

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-6 md:p-12 max-w-[1600px] mx-auto animate-fade-in relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-px w-8 bg-accent-primary" />
             <span className="text-[10px] font-black text-accent-primary uppercase tracking-[0.4em]">Operational Overview</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-text-primary tracking-tighter leading-none">
            {isGuest ? 'GUEST NODE' : `OPERATOR: ${user?.name?.split(' ')[0].toUpperCase()}`}
          </h1>
          <p className="text-text-muted text-sm font-bold uppercase tracking-widest flex items-center gap-3">
             <Clock size={14} className="text-accent-primary" />
             Active Synchronizing: <span className="text-text-primary">{inProgress} Tasks in pipeline</span>
          </p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center justify-center gap-3 px-8 py-5 group"
        >
          <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" /> 
          <span className="text-xs font-bold uppercase tracking-widest">New Task</span>
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 w-full rounded-[2.5rem]" />
          ))
        ) : (
          <>
            <div className="stagger-1"><StatCard icon={CheckSquare} label="Throughput" value={total} color="bg-accent-primary/10 text-accent-primary shadow-blue/20" trend="+8%" /></div>
            <div className="stagger-2"><StatCard icon={TrendingUp} label="Efficiency" value={`${completionRate}%`} color="bg-success/10 text-success shadow-success/20" sub="Success Rate" trend="+12%" /></div>
            <div className="stagger-3"><StatCard icon={Clock} label="In Processing" value={inProgress} color="bg-warning/10 text-warning shadow-warning/20" trend="-3%" /></div>
            <div className="stagger-4"><StatCard icon={AlertCircle} label="System Alerts" value={overdue} color="bg-danger/10 text-danger shadow-danger/20" sub={urgent > 0 ? `${urgent} High Priority` : ''} trend="0%" /></div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Priority tasks */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-8 border-b border-border-subtle/30 pb-4">
            <h2 className="text-xl font-display font-black text-text-primary tracking-tight flex items-center gap-3">
               <Zap size={20} className="text-accent-primary" /> 
               PRIORITY PIPELINE
            </h2>
            <Link to="/tasks" className="text-[10px] font-black text-accent-primary hover:text-accent-hover flex items-center gap-2 uppercase tracking-[0.2em] transition-all group">
              View All Nodes <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="card text-center py-20 bg-surface-1/30 border-dashed border-border-strong/30 rounded-[2.5rem]">
              <div className="w-16 h-16 bg-surface-2 rounded-2xl flex items-center justify-center mx-auto mb-6 opacity-20">
                 <Zap size={40} className="text-text-muted" />
              </div>
              <p className="text-text-muted font-black tracking-widest uppercase text-xs">All channels clear. No active tasks.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task, idx) => {
                const dl = getDeadlineLabel(task.deadline);
                return (
                  <Link
                    key={task._id}
                    to="/tasks"
                    className={`card card-hover flex items-center gap-6 group relative overflow-hidden stagger-${idx + 1}`}
                  >
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2" 
                      style={{ backgroundColor: task.color || '#3B82F6' }}
                    />
                    <div className="flex-1 min-w-0 pl-2">
                       <div className="flex items-center gap-3 mb-1">
                          <p className="text-base font-black text-text-primary tracking-tight truncate group-hover:text-accent-primary transition-colors uppercase">
                             {task.title}
                          </p>
                          {task.priority === 'urgent' && (
                            <span className="w-2 h-2 rounded-full bg-danger animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                          )}
                       </div>
                       <div className="flex items-center gap-4">
                          {dl && <span className={`tag ${dl.cls}`}>{dl.label}</span>}
                          {task.category && <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{task.category}</span>}
                       </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                       <span className={`tag ${STATUS_COLORS[task.status]}`}>{task.status.replace('-', ' ')}</span>
                       <div className="flex -space-x-2">
                          {(task.assignedTo || []).slice(0, 3).map((u, i) => (
                             <div 
                               key={u._id || i} 
                               className="w-6 h-6 rounded-lg border-2 border-bg-secondary bg-surface-2 flex items-center justify-center text-[8px] font-black text-accent-primary"
                               title={u.name}
                             >
                                {(u.name?.[0] || 'U').toUpperCase()}
                             </div>
                          ))}
                          {task.assignedTo?.length > 3 && (
                            <div className="w-6 h-6 rounded-lg border-2 border-bg-secondary bg-surface-2 flex items-center justify-center text-[8px] font-black text-text-muted">
                               +{task.assignedTo.length - 3}
                            </div>
                          )}
                       </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Blocks */}
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-border-subtle/30 pb-4">
            <h2 className="text-xl font-display font-black text-text-primary tracking-tight flex items-center gap-3">
               <Calendar size={20} className="text-text-muted" /> 
               DAILY LOG
            </h2>
          </div>

          {upcomingBlocks.length === 0 ? (
            <div className="card text-center py-16 bg-surface-1/30 border-dashed border-border-strong/30 rounded-[2.5rem]">
              <Calendar size={32} className="text-text-muted/20 mx-auto mb-4" />
              <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">Zero time blocks detected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBlocks.map((block, idx) => (
                <div
                  key={block._id}
                  className={`card card-hover flex flex-col gap-4 border-l-4 stagger-${idx + 1}`}
                  style={{ borderLeftColor: block.color || block.task.color }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-text-primary truncate uppercase tracking-tight">
                      {block.title || block.task.title}
                    </p>
                    <div className="px-2 py-1 bg-surface-2 rounded-lg text-[10px] font-black text-text-muted uppercase tracking-widest">
                       {Math.round((new Date(block.endTime) - new Date(block.startTime)) / 60000)}m
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border-subtle/20 pt-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-text-muted tracking-widest">
                       <Clock size={12} className="text-accent-primary" />
                       {format(new Date(block.startTime), 'HH:mm')} — {format(new Date(block.endTime), 'HH:mm')}
                    </div>
                    <ArrowRight size={14} className="text-text-muted opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Quick Tip / Analytics widget */}
          <div className="card bg-accent-primary/5 border-accent-primary/10 p-6 rounded-[2.5rem] relative overflow-hidden group">
             <div className="relative z-10">
                <h3 className="text-xs font-black text-accent-primary uppercase tracking-[0.2em] mb-2">Efficiency Pro-tip</h3>
                <p className="text-xs text-text-secondary leading-relaxed font-bold">
                   You complete 20% more tasks when you set a goal before 10 AM. Sync your calendar now.
                </p>
                <Link to="/calendar" className="inline-flex items-center gap-2 text-[10px] font-black text-text-primary uppercase tracking-widest mt-4 hover:gap-3 transition-all">
                   Optimize Flow <ArrowRight size={12} />
                </Link>
             </div>
             <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-accent-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          </div>
        </div>
      </div>
      
      {showModal && <TaskModal onClose={() => setShowModal(false)} />}
    </div>
  );
}


function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
