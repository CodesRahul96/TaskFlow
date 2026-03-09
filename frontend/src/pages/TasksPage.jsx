import { useEffect, useState, useCallback } from 'react';
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

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_DOT = { urgent: 'bg-neon-red', high: 'bg-neon-yellow', medium: 'bg-neon-blue', low: 'bg-neon-green' };

function TaskCard({ task, onSelect, onEdit, onDelete, isSelected }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id });
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
      className={`card flex items-start gap-3 cursor-pointer transition-all group ${
        isDragging ? 'opacity-40 shadow-glow scale-95' : 'hover:border-border-default'
      } ${isSelected ? 'border-accent-primary/50 bg-accent-primary/5' : ''}`}
      onClick={() => onSelect(task)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="mt-1 text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      {/* Color indicator */}
      <div className="w-1 h-full rounded-full flex-shrink-0 self-stretch min-h-8" style={{ backgroundColor: task.color }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-sm leading-snug ${task.status === 'completed' ? 'line-through text-text-muted' : 'text-text-primary'}`}>
              {task.title}
            </p>

            {task.description && (
              <p className="text-text-muted text-xs mt-0.5 truncate">{task.description}</p>
            )}

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {totalSubs > 0 && (
                <span className="text-xs text-text-muted">{completedSubs}/{totalSubs} tasks</span>
              )}
              {(task.timeBlocks || []).length > 0 && (
                <span className="text-xs text-text-muted flex items-center gap-0.5">
                  <Clock size={10} /> {task.timeBlocks.length} blocks
                </span>
              )}
              {task.tags?.slice(0, 2).map(tag => (
                <span key={tag} className="text-xs text-text-muted">#{tag}</span>
              ))}
              {task.deadline && (
                <span className={`text-xs ${isOverdue ? 'text-neon-red' : isDueToday ? 'text-neon-yellow' : 'text-text-muted'}`}>
                  {isOverdue ? '⚠ Overdue' : isDueToday ? '📅 Today' : format(new Date(task.deadline), 'MMM d')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subtask progress */}
        {totalSubs > 0 && (
          <div className="mt-2 h-1 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-neon-green rounded-full transition-all"
              style={{ width: `${(completedSubs / totalSubs) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={() => onEdit(task)} className="p-1 text-text-muted hover:text-text-primary transition-colors rounded">
          <Edit2 size={13} />
        </button>
        <button onClick={() => onDelete(task._id)} className="p-1 text-text-muted hover:text-neon-red transition-colors rounded">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

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
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  // Sync guest tasks if just logged in
  useEffect(() => {
    if (token) {
      const { syncGuestTasks } = useTaskStore.getState();
      const guestTasks = JSON.parse(localStorage.getItem('tf_guest_tasks') || '[]');
      if (guestTasks.length > 0) syncGuestTasks();
    }
  }, [token]);

  const sortedTasks = [...localTasks].sort((a, b) => {
    if (filters.sort === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (filters.sort === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = localTasks.findIndex(t => t._id === active.id);
    const newIndex = localTasks.findIndex(t => t._id === over.id);
    const reordered = arrayMove(localTasks, oldIndex, newIndex);
    setLocalTasks(reordered);
    reordered.forEach((t, i) => {
      if (!isGuest) updateTask(t._id, { order: i }, false);
    });
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(taskId, isGuest);
    if (selectedTask?._id === taskId) setSelectedTask(null);
  };

  const activeTask = activeId ? localTasks.find(t => t._id === activeId) : null;

  const statusGroups = {
    'todo': sortedTasks.filter(t => t.status === 'todo'),
    'in-progress': sortedTasks.filter(t => t.status === 'in-progress'),
    'completed': sortedTasks.filter(t => t.status === 'completed'),
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Task list panel */}
      <div className={`flex flex-col ${selectedTask ? 'hidden md:flex md:w-1/2' : 'flex-1'} transition-all duration-300`}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 md:p-5 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-display font-bold text-text-primary">Tasks</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchTasks(isGuest)} className="btn-ghost p-2" title="Refresh">
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => { setEditTask(null); setShowModal(true); }}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={16} /> <span className="hidden sm:inline">New Task</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                className="input-field pl-9 text-sm"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={e => setFilters({ search: e.target.value })}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-ghost flex items-center gap-1.5 px-3 text-sm ${showFilters ? 'text-accent-glow' : ''}`}
            >
              <Filter size={15} /> <span className="hidden sm:inline">Filters</span>
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
                <option value="-createdAt">Newest First</option>
                <option value="createdAt">Oldest First</option>
                <option value="priority">By Priority</option>
                <option value="deadline">By Deadline</option>
              </select>
              <button
                onClick={() => setFilters({ status: '', priority: '', search: '', sort: '-createdAt' })}
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
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
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
              <SortableContext items={sortedTasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sortedTasks.map(task => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onSelect={setSelectedTask}
                      onEdit={t => { setEditTask(t); setShowModal(true); }}
                      onDelete={handleDelete}
                      isSelected={selectedTask?._id === task._id}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeTask && (
                  <div className="card opacity-80 shadow-glow-lg border-accent-primary/50">
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
