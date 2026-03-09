import { useState, useEffect } from 'react';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths,
  isSameDay, isSameMonth, isToday, getHours, getMinutes,
  addDays, parseISO, differenceInMinutes, startOfDay, setHours, setMinutes
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, X } from 'lucide-react';
import useTaskStore from '../store/taskStore';
import useAuthStore from '../store/authStore';
import api from '../api/client';

const HOUR_HEIGHT = 60; // px per hour
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

function TimeBlockEventModal({ event, onClose, onDelete }) {
  if (!event) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-secondary border border-border-default rounded-xl p-5 max-w-sm w-full shadow-glow animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
            <h3 className="font-semibold text-text-primary">{event.title}</h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2 text-sm text-text-secondary">
          <p className="flex items-center gap-2">
            <Clock size={14} className="text-text-muted" />
            {format(new Date(event.start), 'h:mm a')} – {format(new Date(event.end), 'h:mm a')}
          </p>
          <p className="flex items-center gap-2">
            <Calendar size={14} className="text-text-muted" />
            Task: <span className="text-text-primary font-medium">{event.task?.title}</span>
          </p>
          {event.notes && <p className="text-text-muted">{event.notes}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => { onDelete(event); onClose(); }}
            className="flex-1 py-2 text-sm rounded-lg border border-neon-red/30 text-neon-red hover:bg-neon-red/10 transition-all"
          >
            Delete Block
          </button>
          <button onClick={onClose} className="flex-1 btn-primary py-2 text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function WeekView({ date, events, onEventClick, onSlotClick }) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const allDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const now = new Date();

  // On mobile, we only show 3 days (around today or the start of the week)
  // For simplicity, we'll just slice the array based on a media query (handled by CSS)
  const days = allDays; 

  const getEventsForDay = (day) =>
    events.filter(e => isSameDay(new Date(e.start), day));

  const getEventStyle = (event) => {
    const startMin = (getHours(new Date(event.start)) - START_HOUR) * HOUR_HEIGHT +
      (getMinutes(new Date(event.start)) / 60) * HOUR_HEIGHT;
    const duration = differenceInMinutes(new Date(event.end), new Date(event.start));
    const height = Math.max((duration / 60) * HOUR_HEIGHT, 20);
    return { top: `${startMin}px`, height: `${height}px` };
  };

  const nowStyle = {
    top: `${(now.getHours() - START_HOUR) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT}px`,
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-4 md:grid-cols-8 border-b border-border-subtle flex-shrink-0">
        <div className="p-2 md:p-3" /> {/* Time gutter */}
        {days.map((day, idx) => (
          <div
            key={day.toString()}
            className={`p-2 md:p-3 text-center border-l border-border-subtle ${isToday(day) ? 'bg-accent-primary/10' : ''} ${idx >= 3 ? 'hidden md:block' : ''}`}
          >
            <p className="text-[10px] md:text-xs text-text-muted uppercase">{format(day, 'EEE')}</p>
            <p className={`text-sm md:text-lg font-bold mt-0.5 ${isToday(day) ? 'text-accent-glow' : 'text-text-primary'}`}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-4 md:grid-cols-8 relative" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
          {/* Hour labels */}
          <div className="col-span-1">
            {HOURS.map(hour => (
              <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="flex items-start justify-end pr-2 md:pr-3 pt-1">
                <span className="text-[10px] md:text-xs text-text-muted font-mono">
                  {format(setHours(new Date(), hour), 'h a')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => (
            <div
              key={day.toString()}
              className={`col-span-1 relative border-l border-border-subtle ${isToday(day) ? 'bg-accent-primary/5' : ''} ${di >= 3 ? 'hidden md:block' : ''}`}
              style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}
            >
              {/* Hour lines */}
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-border-subtle/50 cursor-pointer hover:bg-accent-primary/5 transition-colors"
                  style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                  onClick={() => {
                    const slotTime = setMinutes(setHours(new Date(day), hour), 0);
                    onSlotClick(slotTime);
                  }}
                />
              ))}

              {/* Current time line */}
              {isToday(day) && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: nowStyle.top }}
                >
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-red -ml-0.5 md:-ml-1" />
                    <div className="flex-1 h-0.5 bg-neon-red" />
                  </div>
                </div>
              )}

              {/* Events */}
              {getEventsForDay(day).map((event, ei) => {
                const style = getEventStyle(event);
                return (
                  <div
                    key={event.id}
                    className="absolute left-0.5 right-0.5 rounded-md px-1 py-0.5 cursor-pointer hover:brightness-110 transition-all z-20 overflow-hidden"
                    style={{ ...style, backgroundColor: event.color + 'dd', borderLeft: `2px solid ${event.color}` }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                  >
                    <p className="text-[10px] font-medium text-white leading-tight truncate">{event.title}</p>
                    <p className="text-[9px] text-white/70 leading-tight">
                      {format(new Date(event.start), 'h:mm')}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthView({ date, events, onEventClick }) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="grid grid-cols-7 border-b border-border-subtle flex-shrink-0">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="p-3 text-center text-xs text-text-muted uppercase font-medium">{d}</div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(100px, 1fr)' }}>
          {days.map(day => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.start), day));
            return (
              <div
                key={day.toString()}
                className={`border-r border-b border-border-subtle p-2 ${
                  !isSameMonth(day, date) ? 'opacity-40' : ''
                } ${isToday(day) ? 'bg-accent-primary/10' : ''}`}
              >
                <p className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday(day) ? 'bg-accent-primary text-white' : 'text-text-secondary'
                }`}>
                  {format(day, 'd')}
                </p>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="text-xs px-1.5 py-0.5 rounded cursor-pointer hover:brightness-110 transition-all truncate text-white"
                      style={{ backgroundColor: event.color + 'cc' }}
                    >
                      {format(new Date(event.start), 'h:mm')} {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-text-muted px-1">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [slotTask, setSlotTask] = useState(null);
  const { tasks, fetchTasks, deleteTimeBlock } = useTaskStore();
  const { isGuest } = useAuthStore();

  useEffect(() => { fetchTasks(isGuest); }, [isGuest]);

  useEffect(() => {
    // Build events from tasks' timeBlocks
    const evs = [];
    tasks.forEach(task => {
      (task.timeBlocks || []).forEach(block => {
        evs.push({
          id: block._id,
          title: block.title || task.title,
          start: block.startTime,
          end: block.endTime,
          color: block.color || task.color || '#6366f1',
          notes: block.notes,
          task: { _id: task._id, title: task.title, priority: task.priority },
          taskId: task._id,
          blockId: block._id,
        });
      });
    });
    setEvents(evs);
  }, [tasks]);

  const navigate = (dir) => {
    if (view === 'week') setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    if (view === 'month') setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  };

  const handleDeleteEvent = async (event) => {
    await deleteTimeBlock(event.taskId, event.blockId, isGuest);
  };

  const title = view === 'week'
    ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
    : format(currentDate, 'MMMM yyyy');

  // ── Add Time Block Modal (from slot click or + button) ──────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ taskId: '', title: '', startTime: '', endTime: '', notes: '' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const openAddModal = (prefilledStart) => {
    const start = prefilledStart || new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
    setAddForm({
      taskId: '',
      title: '',
      startTime: start.toISOString().slice(0, 16),
      endTime: end.toISOString().slice(0, 16),
      notes: '',
    });
    setAddError('');
    setShowAddModal(true);
  };

  const handleAddBlock = async (e) => {
    e.preventDefault();
    if (!addForm.taskId) { setAddError('Please select a task'); return; }
    setAddLoading(true);
    setAddError('');
    try {
      await useTaskStore.getState().addTimeBlock(addForm.taskId, {
        title: addForm.title,
        startTime: addForm.startTime,
        endTime: addForm.endTime,
        notes: addForm.notes,
      }, isGuest);
      fetchTasks(isGuest);
      setShowAddModal(false);
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add time block. Check for overlaps.');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border-subtle flex-shrink-0 gap-3">
        <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar">
          <h1 className="text-lg md:text-xl font-display font-bold text-text-primary">Calendar</h1>
          <div className="flex items-center gap-1 bg-surface-1 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2 md:px-3 py-1.5 text-[10px] md:text-xs text-text-secondary hover:text-text-primary transition-colors rounded"
            >
              Today
            </button>
            <button onClick={() => navigate(-1)} className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded">
              <ChevronRight size={14} />
            </button>
          </div>
          <span className="font-semibold text-text-primary text-xs md:text-base whitespace-nowrap">{title}</span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center bg-surface-1 rounded-lg p-1">
            {['week', 'month'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-[10px] md:text-xs font-medium capitalize rounded transition-all ${
                  view === v ? 'bg-accent-primary text-white shadow-glow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => openAddModal()} className="btn-primary flex items-center gap-2 text-[10px] md:text-xs px-2 md:px-3 py-2">
            <Plus size={14} /> <span className="hidden sm:inline">Schedule</span>
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        {view === 'week' ? (
          <WeekView
            date={currentDate}
            events={events}
            onEventClick={setSelectedEvent}
            onSlotClick={(time) => openAddModal(time)}
          />
        ) : (
          <MonthView
            date={currentDate}
            events={events}
            onEventClick={setSelectedEvent}
          />
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-t border-border-subtle flex items-center gap-4 flex-shrink-0">
        <p className="text-xs text-text-muted">Scheduled blocks: {events.length}</p>
        {events.slice(0, 4).map(e => (
          <div key={e.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
            <span className="text-xs text-text-muted truncate max-w-24">{e.task?.title}</span>
          </div>
        ))}
        {!isGuest && (
          <span className="ml-auto text-xs text-text-muted">Click a time slot to schedule</span>
        )}
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <TimeBlockEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* Add Time Block Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-bg-secondary border border-border-default rounded-2xl p-6 max-w-md w-full shadow-glow-lg animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-text-primary">Schedule Time Block</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
            </div>
            {addError && <p className="text-neon-red text-sm mb-4 bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">{addError}</p>}
            <form onSubmit={handleAddBlock} className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Task *</label>
                <select required className="input-field text-sm" value={addForm.taskId} onChange={e => setAddForm(f => ({ ...f, taskId: e.target.value }))}>
                  <option value="">Select a task...</option>
                  {tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').map(t => (
                    <option key={t._id} value={t._id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Label (optional)</label>
                <input type="text" className="input-field text-sm" placeholder="e.g. Deep work session" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Start *</label>
                  <input type="datetime-local" required className="input-field text-xs" value={addForm.startTime} onChange={e => setAddForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">End *</label>
                  <input type="datetime-local" required className="input-field text-xs" value={addForm.endTime} onChange={e => setAddForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Notes</label>
                <input type="text" className="input-field text-sm" placeholder="Optional notes..." value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={addLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {addLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
