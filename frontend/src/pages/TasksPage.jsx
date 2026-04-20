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
  Plus, Search, Filter, SortAsc, Trash2, Edit2, Clock, ChevronDown,
  GripVertical, CheckSquare, AlertCircle, Tag, X, RefreshCw
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import useTaskStore from '../store/taskStore';
import useAuthStore from '../store/authStore';
import TaskModal from '../components/tasks/TaskModal';
import TaskDetail from '../components/tasks/TaskDetail';
import Loader from '../components/ui/Loader';

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_DOT = { urgent: 'bg-danger', high: 'bg-warning', medium: 'bg-accent-primary', low: 'bg-success' };

const TaskCard = memo(({ task, onSelect, onEdit, onDelete, isSelected, index }) => {
  const taskId = (task._id || task).toString();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: taskId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const completedSubs = (task.subtasks || []).filter(s => s.completed).length;
  const totalSubs = (task.subtasks || []).length;

  const deadline = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadline && isPast(deadline) && task.status !== 'completed';
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
          <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]} shadow-sm`} />
          <p className={`font-black text-sm tracking-tight truncate transition-colors uppercase ${
            task.status === 'completed' ? 'line-through text-text-muted opacity-50' : 'text-text-primary group-hover:text-accent-primary'
          }`}>
            {task.title}
          </p>
        </div>

        <div className="flex items-center gap-5 mt-2 overflow-hidden">
          {task.deadline && (
            <span className={`text-[9px] font-black uppercase tracking-[0.1em] flex items-center gap-1.5 ${isOverdue ? 'text-danger' : isDueToday ? 'text-warning' : 'text-text-muted opacity-60'}`}>
              <Clock size={10} strokeWidth={3} /> {isOverdue ? 'CRITICAL' : isDueToday ? 'TODAY' : format(new Date(task.deadline), 'MMM d')}
            </span>
          )}
          {totalSubs > 0 && (
            <span className="text-[9px] font-black uppercase text-text-muted tracking-[0.1em] opacity-60 flex items-center gap-1.5">
               <CheckSquare size={10} strokeWidth={3} /> {completedSubs}/{totalSubs} NODES
            </span>
          )}
          {task.category && (
            <span className="text-[9px] font-black uppercase text-accent-primary tracking-[0.2em] px-2 py-0.5 bg-accent-primary/5 rounded border border-accent-primary/10 truncate">
               {task.category}
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
          task.status === 'todo' ? 'status-todo' :
          task.status === 'in-progress' ? 'status-in-progress' :
          task.status === 'completed' ? 'status-completed' : 'status-cancelled'
        }`}>
          {task.status.replace('-', ' ')}
        </span>

        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(task)} className="p-2 text-text-muted hover:text-accent-primary hover:bg-surface-2 transition-all rounded-xl border border-transparent hover:border-border-default">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(task._id)} className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 transition-all rounded-xl border border-transparent hover:border-danger/10">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});



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
    // Filter for unique IDs to prevent duplicate key warnings if state updates map redundant items
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

  const baseSortedTasks = [...localTasks].sort((a, b) => {
    if (filters.sort === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (filters.sort === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (filters.sort === 'order') return (a.order || 0) - (b.order || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // FINAL RENDER SAFETY: Deduplicate final list to prevent React key collisions even during rapid state shifts
  const sortedTasks = baseSortedTasks.filter((task, index, self) => 
    index === self.findIndex((t) => t._id.toString() === task._id.toString())
  );

  const activeTask = activeId ? localTasks.find(t => t._id === activeId) : null;

  const statusGroups = {
    'todo': sortedTasks.filter(t => t.status === 'todo'),
    'in-progress': sortedTasks.filter(t => t.status === 'in-progress'),
    'completed': sortedTasks.filter(t => t.status === 'completed'),
  };

  const handleDelete = async (target) => {
    // Determine if we received a task object or an ID
    const taskId = typeof target === 'object' ? target._id : target;
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId, isGuest);
      if (selectedTask?._id === taskId) setSelectedTask(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Task list panel */}
      <div className={`flex flex-col ${selectedTask ? 'hidden md:flex md:w-1/2' : 'flex-1'} transition-all duration-300`}>
        {/* Header */}
        <div className="flex-shrink-0 p-6 md:p-8 border-b border-border-subtle bg-surface-1/20">
          <div className="flex items-center justify-between mb-8">
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

          {/* Search & Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
              <input
                type="text"
                className="input-field pl-12"
                placeholder="Search by title, tags, or category..."
                value={filters.search}
                onChange={e => setFilters({ search: e.target.value })}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 px-4 ${showFilters ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary' : ''}`}
            >
              <Filter size={18} /> <span className="font-bold text-xs uppercase tracking-wider">Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 flex gap-2 flex-wrap animate-fade-in">
              <select
                className="input-field text-xs py-1.5 w-auto"
                value={filters.status}
                onChange={e => setFilters({ status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                className="input-field text-xs py-1.5 w-auto"
                value={filters.priority}
                onChange={e => setFilters({ priority: e.target.value })}
              >
                <option value="">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                className="input-field text-xs py-1.5 w-auto"
                value={filters.sort}
                onChange={e => setFilters({ sort: e.target.value })}
              >
                <option value="order">Manual Order</option>
                <option value="-createdAt">Newest First</option>
                <option value="createdAt">Oldest First</option>
                <option value="priority">By Priority</option>
                <option value="deadline">By Deadline</option>
              </select>
              <button
                onClick={() => setFilters({ status: '', priority: '', search: '', sort: 'order' })}
                className="text-xs text-text-muted hover:text-text-primary transition-colors px-2"
              >
                Clear
              </button>
            </div>
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
              <p className="text-text-muted">No tasks found</p>
              <button
                onClick={() => { setEditTask(null); setShowModal(true); }}
                className="btn-primary mt-4 inline-flex items-center gap-2"
              >
                <Plus size={14} /> Create Task
              </button>
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
