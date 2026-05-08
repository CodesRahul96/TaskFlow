import { useEffect, useState, useCallback, memo } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Search, Filter, Trash2, Edit2, Clock, ChevronDown,
  GripVertical, CheckSquare, Tag, X, RefreshCw
} from 'lucide-react';
import { format, isPast, isToday, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import useTaskStore from '../store/taskStore';
import useAuthStore from '../store/authStore';
import TaskModal from '../components/tasks/TaskModal';
import TaskDetail from '../components/tasks/TaskDetail';
import TaskFilterPanel, { ActiveFilterChips, getActiveFilterCount } from '../components/tasks/TaskFilterPanel';
import Loader from '../components/ui/Loader';

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_DOT   = { urgent: 'bg-danger', high: 'bg-warning', medium: 'bg-accent-primary', low: 'bg-success' };

// ── TaskCard ────────────────────────────────────────────────────────────────
const TaskCard = memo(({ task, onSelect, onEdit, onDelete, isSelected, index }) => {
  const taskId = (task._id || task).toString();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: taskId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const completedSubs = (task.subtasks || []).filter(s => s.completed).length;
  const totalSubs = (task.subtasks || []).length;

  const deadline = task.deadline ? new Date(task.deadline) : null;
  const isOverdue  = deadline && isPast(deadline) && task.status !== 'completed';
  const isDueToday = deadline && isToday(deadline);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card card-hover flex items-center gap-6 cursor-pointer group relative overflow-hidden stagger-${(index % 5) + 1} ${
        isDragging ? 'opacity-40 shadow-premium scale-[0.98]' : ''
      } ${isSelected ? 'border-accent-primary ring-1 ring-accent-primary/20 bg-accent-primary/5' : 'bg-surface-1/40 hover:bg-surface-1'}`}
      onClick={() => onSelect(task)}
    >
      {/* Dynamic Status Accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-all duration-300"
        style={{ backgroundColor: task.color || '#3B82F6' }}
      />

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 -ml-2"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={16} />
      </div>

      {/* Title & Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]} shadow-sm flex-shrink-0`} />
          <p className={`font-black text-sm md:text-base tracking-tight truncate transition-colors uppercase ${
            task.status === 'completed' ? 'line-through text-text-muted opacity-50' : 'text-text-primary group-hover:text-accent-primary'
          }`}>
            {task.title}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 md:gap-x-5 gap-y-1.5 mt-1.5">
          {task.deadline && (
            <span className={`text-[9px] font-black uppercase tracking-[0.1em] flex items-center gap-1.5 ${isOverdue ? 'text-danger' : isDueToday ? 'text-warning' : 'text-text-muted opacity-60'}`}>
              <Clock size={10} strokeWidth={3} /> {isOverdue ? 'CRITICAL' : isDueToday ? 'TODAY' : format(new Date(task.deadline), 'MMM d')}
            </span>
          )}
          {(task.timeBlocks || []).length > 0 && (
            <span className="text-[9px] font-black uppercase text-accent-primary/70 tracking-[0.1em] opacity-70 flex items-center gap-1.5">
              <Clock size={10} strokeWidth={3} /> {task.timeBlocks.length} BLOCK{task.timeBlocks.length > 1 ? 'S' : ''}
            </span>
          )}
          {totalSubs > 0 && (
            <span className="text-[9px] font-black uppercase text-text-muted tracking-[0.1em] opacity-60 flex items-center gap-1.5">
               <CheckSquare size={10} strokeWidth={3} /> {completedSubs}/{totalSubs} NODES
            </span>
          )}
          {(task.tags || []).length > 0 && (
            <span className="text-[9px] font-black uppercase text-accent-primary tracking-[0.2em] px-2 py-0.5 bg-accent-primary/5 rounded border border-accent-primary/10 truncate max-w-[120px]">
              #{task.tags[0]}{task.tags.length > 1 ? ` +${task.tags.length - 1}` : ''}
            </span>
          )}
          {/* Collaborators */}
          {task.assignedTo?.length > 0 && (
            <div className="flex -space-x-2 ml-1">
              {task.assignedTo.slice(0, 3).map((u, i) => {
                const userId = (u._id || u).toString();
                return (
                  <div
                    key={`collab-${taskId}-${userId}-${i}`}
                    className="w-5 h-5 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-[10px] font-black text-accent-primary shadow-sm"
                    title={u.name || 'Collaborator'}
                  >
                    {(u.name?.[0] || '?').toUpperCase()}
                  </div>
                );
              })}
              {task.assignedTo.length > 3 && (
                <div className="w-5 h-5 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-[9px] font-black text-text-muted">
                  +{task.assignedTo.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Status and Actions */}
      <div className="flex items-center gap-5 flex-shrink-0">
        <span className={`tag ${
          task.status === 'todo'        ? 'status-todo' :
          task.status === 'in-progress' ? 'status-in-progress' :
          task.status === 'completed'   ? 'status-completed' : 'status-cancelled'
        }`}>
          {task.status.replace('-', ' ')}
        </span>

        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all translate-x-0 md:translate-x-2 md:group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(task)} className="p-2 text-text-muted hover:text-accent-primary active:bg-surface-2 md:hover:bg-surface-2 transition-all rounded-xl border border-transparent md:hover:border-border-default">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(task._id)} className="p-2 text-text-muted hover:text-danger active:bg-danger/10 md:hover:bg-danger/10 transition-all rounded-xl border border-transparent md:hover:border-danger/10">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

// ── Client-side filter & sort for guest mode ─────────────────────────────────
function applyClientFilters(tasks, filters) {
  let result = [...tasks];

  // Search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(q)) ||
      t.description?.toLowerCase().includes(q)
    );
  }

  // Status
  if (filters.status) result = result.filter(t => t.status === filters.status);

  // Priority
  if (filters.priority) result = result.filter(t => t.priority === filters.priority);

  // Tags multi-select
  if ((filters.tags || []).length > 0) {
    result = result.filter(t => (filters.tags).some(tag => (t.tags || []).includes(tag)));
  }

  // Date range
  if (filters.dateFrom || filters.dateTo) {
    result = result.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      if (filters.dateFrom && d < new Date(filters.dateFrom)) return false;
      if (filters.dateTo) {
        const end = new Date(filters.dateTo); end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }

  // Quick filters
  if (filters.overdue)    result = result.filter(t => t.deadline && isPast(new Date(t.deadline)) && t.status !== 'completed');
  if (filters.dueToday)   result = result.filter(t => t.deadline && isToday(new Date(t.deadline)));
  if (filters.noDeadline) result = result.filter(t => !t.deadline);

  // Time block date
  if (filters.timeBlockDate) {
    const dayStart = startOfDay(new Date(filters.timeBlockDate));
    const dayEnd   = endOfDay(new Date(filters.timeBlockDate));
    result = result.filter(t =>
      (t.timeBlocks || []).some(b => {
        const s = new Date(b.startTime);
        return s >= dayStart && s <= dayEnd;
      })
    );
  }

  // Sort
  const dir = filters.sortDir === 'desc' ? -1 : 1;
  result.sort((a, b) => {
    if (filters.sort === 'priority') return dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    if (filters.sort === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return dir * (new Date(a.deadline) - new Date(b.deadline));
    }
    if (filters.sort === 'title')     return dir * a.title.localeCompare(b.title);
    if (filters.sort === 'createdAt') return dir * (new Date(a.createdAt) - new Date(b.createdAt));
    if (filters.sort === 'updatedAt') return dir * (new Date(a.updatedAt) - new Date(b.updatedAt));
    if (filters.sort === 'order')     return (a.order || 0) - (b.order || 0);
    return 0;
  });

  return result;
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { tasks, loading, fetchTasks, updateTask, deleteTask, setSelectedTask, selectedTask, filters, setFilters } = useTaskStore();
  const { isGuest, token } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [localTasks, setLocalTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchTasks(isGuest); }, [isGuest, filters]);
  useEffect(() => {
    const uniqueTasks = tasks.filter((task, index, self) =>
      index === self.findIndex((t) => t._id.toString() === task._id.toString())
    );
    setLocalTasks(uniqueTasks);
  }, [tasks]);

  // Sync guest tasks if just logged in
  useEffect(() => {
    if (token) {
      const { syncGuestTasks } = useTaskStore.getState();
      const guestTasks = JSON.parse(localStorage.getItem('tf_guest_tasks') || '[]');
      if (guestTasks.length > 0) syncGuestTasks();
    }
  }, [token]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = localTasks.findIndex(t => t._id === active.id);
    const newIndex = localTasks.findIndex(t => t._id === over.id);
    const reordered = arrayMove(localTasks, oldIndex, newIndex);
    setLocalTasks(reordered);
    const orders = reordered.map((t, i) => ({ id: t._id, order: i }));
    const { reorderTasks } = useTaskStore.getState();
    reorderTasks(orders, isGuest);
  };

  // Apply client-side filters (guest mode) or server-side (auth mode deduplication)
  const sortedTasks = (() => {
    const filtered = applyClientFilters(localTasks, filters);
    // Final dedup safety
    return filtered.filter((task, index, self) =>
      index === self.findIndex((t) => t._id.toString() === task._id.toString())
    );
  })();

  const activeTask = activeId ? localTasks.find(t => t._id === activeId) : null;
  const activeFilterCount = getActiveFilterCount(filters);

  const handleClearAllFilters = () => setFilters({
    status: '', priority: '', tag: '', tags: [], search: '',
    sort: 'order', sortDir: 'asc',
    dateFrom: '', dateTo: '', timeBlockDate: '',
    overdue: false, dueToday: false, noDeadline: false,
  });

  const handleDelete = async (target) => {
    const taskId = typeof target === 'object' ? target._id : target;
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId, isGuest);
      if (selectedTask?._id === taskId) setSelectedTask(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Task list panel */}
      <div className={`flex flex-col ${selectedTask ? 'hidden md:flex md:w-1/2' : 'flex-1'} transition-all duration-300 relative`}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 md:p-8 border-b border-border-subtle bg-surface-1/20 z-10">
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary tracking-tight">Tasks</h1>
              <p className="text-xs text-text-muted mt-1 font-medium">Manage and organize your workload.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchTasks(isGuest)}
                className="btn-secondary p-2.5"
                title="Refresh"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => { setEditTask(null); setShowModal(true); }}
                className="btn-primary flex items-center gap-2 px-5"
              >
                <Plus size={18} /> <span className="font-bold">New Task</span>
              </button>
            </div>
          </div>

          {/* Search & Filter toggle */}
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
              <input
                type="text"
                className="input-field pl-12"
                placeholder="Search by title, tags, or description..."
                value={filters.search}
                onChange={e => setFilters({ search: e.target.value })}
              />
            </div>
            <button
              id="task-filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary relative flex items-center gap-2 px-3 md:px-4 transition-all ${
                showFilters ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary' : ''
              }`}
            >
              <Filter size={18} />
              <span className="font-bold text-xs uppercase tracking-wider hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent-primary text-white text-[9px] font-black flex items-center justify-center shadow-blue animate-pulse-once">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active filter chips */}
          <ActiveFilterChips
            filters={filters}
            setFilters={setFilters}
            onClearAll={handleClearAllFilters}
          />

          {/* Full filter panel */}
          {showFilters && (
            <TaskFilterPanel
              filters={filters}
              setFilters={setFilters}
              allTasks={localTasks}
              onClose={() => setShowFilters(false)}
            />
          )}
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Loader key={i} variant="skeleton" className="h-20 rounded-xl" />
              ))}
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="text-center py-16">
              <CheckSquare size={40} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm font-medium">
                {activeFilterCount > 0 ? 'No tasks match your filters.' : 'No tasks found.'}
              </p>
              {activeFilterCount > 0 ? (
                <button onClick={handleClearAllFilters} className="btn-secondary mt-4 inline-flex items-center gap-2 text-xs">
                  <X size={14} /> Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => { setEditTask(null); setShowModal(true); }}
                  className="btn-primary mt-4 inline-flex items-center gap-2"
                >
                  <Plus size={14} /> Create Task
                </button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={({ active }) => setActiveId(active.id)}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sortedTasks.map(t => t._id.toString())} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {sortedTasks.map((task, idx) => (
                    <TaskCard
                      key={`task-item-${task._id.toString()}`}
                      task={task}
                      index={idx}
                      onSelect={setSelectedTask}
                      onEdit={t => { setEditTask(t); setShowModal(true); }}
                      onDelete={handleDelete}
                      isSelected={selectedTask?._id?.toString() === task._id?.toString()}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeTask && (
                  <div className="card opacity-80 shadow-blue border-accent-primary/30">
                    <p className="text-sm font-medium text-text-primary">{activeTask.title}</p>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* Task detail panel */}
      {selectedTask && (
        <div className="w-full md:w-1/2 border-l border-border-subtle animate-slide-in overflow-hidden">
          <TaskDetail
            task={selectedTask}
            onEdit={() => { setEditTask(selectedTask); setShowModal(true); }}
            onClose={() => setSelectedTask(null)}
          />
        </div>
      )}

      {/* Task modal */}
      {showModal && (
        <TaskModal
          task={editTask}
          onClose={() => { setShowModal(false); setEditTask(null); }}
        />
      )}
    </div>
  );
}
