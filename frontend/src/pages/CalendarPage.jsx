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
import Loader from '../components/ui/Loader';

const HOUR_HEIGHT = 60; // px per hour
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

function TimeBlockEventModal({ event, onClose, onDelete }) {
  if (!event) return null;
  return (
    <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-bg-secondary border border-border-subtle rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-lg shadow-sm" style={{ backgroundColor: event.color }} />
            <h3 className="font-display font-black text-xl text-text-primary tracking-tight">{event.title}</h3>
          </div>
          <button onClick={onClose} className="btn-secondary p-2 rounded-xl text-text-muted hover:text-text-primary transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 text-sm font-medium">
          <div className="flex items-center gap-3 p-3 bg-surface-1/40 rounded-xl border border-border-subtle/50">
            <Clock size={16} className="text-accent-primary" />
            <span className="text-text-secondary uppercase text-[10px] font-bold tracking-widest">
              {format(new Date(event.start), 'h:mm a')} – {format(new Date(event.end), 'h:mm a')}
            </span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-surface-1/40 rounded-xl border border-border-subtle/50">
            <Calendar size={16} className="text-accent-primary" />
            <span className="text-text-secondary">
              Task: <span className="text-text-primary font-bold">{event.task?.title}</span>
            </span>
          </div>
          {event.notes && (
            <div className="p-4 bg-surface-2/30 rounded-xl italic text-text-muted text-xs leading-relaxed">
              {event.notes}
            </div>
          )}
        </div>
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => { onDelete(event); onClose(); }}
            className="flex-1 btn-secondary text-danger border-danger/20 hover:bg-danger/10 py-3.5 font-bold uppercase tracking-widest text-[10px]"
          >
            Delete Block
          </button>
          <button onClick={onClose} className="flex-1 btn-primary py-3.5 font-bold uppercase tracking-widest text-[10px] shadow-blue">
            Dismiss
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
  const days = allDays; 

  const getEventsForDay = (day) =>
    events.filter(e => isSameDay(new Date(e.start), day));

  const getEventStyle = (event) => {
    const startMin = (getHours(new Date(event.start)) - START_HOUR) * HOUR_HEIGHT +
      (getMinutes(new Date(event.start)) / 60) * HOUR_HEIGHT;
    const duration = differenceInMinutes(new Date(event.end), new Date(event.start));
    const height = Math.max((duration / 60) * HOUR_HEIGHT, 24);
    return { top: `${startMin}px`, height: `${height}px` };
  };

  const nowStyle = {
    top: `${(now.getHours() - START_HOUR) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT}px`,
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-surface-1/5">
      {/* Day headers */}
      <div className="grid grid-cols-4 md:grid-cols-8 border-b border-border-subtle/50 flex-shrink-0 bg-surface-1/10 backdrop-blur-sm">
        <div className="p-3 border-r border-border-subtle/30" />
        {days.map((day, idx) => (
          <div
            key={day.toString()}
            className={`p-4 text-center border-l border-border-subtle/30 ${isToday(day) ? 'bg-accent-primary/[0.03]' : ''} ${idx >= 3 ? 'hidden md:block' : ''}`}
          >
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{format(day, 'EEE')}</p>
            <p className={`text-xl font-display font-black mt-1 ${isToday(day) ? 'text-accent-primary' : 'text-text-primary'}`}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-4 md:grid-cols-8 relative" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
          {/* Hour labels */}
          <div className="col-span-1 border-r border-border-subtle/30 bg-surface-1/10">
            {HOURS.map(hour => (
              <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="flex items-start justify-end pr-4 pt-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter opacity-50">
                  {format(setHours(new Date(), hour), 'h a')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => (
            <div
              key={day.toString()}
              className={`col-span-1 relative border-l border-border-subtle/20 ${isToday(day) ? 'bg-accent-primary/[0.01]' : ''} ${di >= 3 ? 'hidden md:block' : ''}`}
              style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}
            >
              {/* Hour lines */}
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-border-subtle/10 cursor-alias hover:bg-accent-primary/[0.02] transition-colors"
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
                  className="absolute left-0 right-0 z-30 pointer-events-none"
                  style={{ top: nowStyle.top }}
                >
                  <div className="flex items-center translate-y-[-50%]">
                    <div className="w-2.5 h-2.5 rounded-full bg-danger shadow-lg shadow-danger/50 -ml-1 border border-white dark:border-bg-primary" />
                    <div className="flex-1 h-px bg-gradient-to-r from-danger to-transparent" />
                  </div>
                </div>
              )}

              {/* Events */}
              {getEventsForDay(day).map((event) => {
                const style = getEventStyle(event);
                return (
                  <div
                    key={event.id}
                    className="absolute left-1.5 right-1.5 rounded-xl px-3 py-2.5 cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all z-20 overflow-hidden shadow-sm border border-border-subtle/30"
                    style={{ ...style, backgroundColor: event.color + '15', borderLeft: `4px solid ${event.color}` }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                  >
                    <div className="absolute inset-0 bg-white/5 dark:bg-black/5 pointer-events-none" />
                    <p className="text-[11px] font-bold text-text-primary leading-tight truncate relative z-10">{event.title}</p>
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-1 relative z-10">
                      {format(new Date(event.start), 'h:mm a')}
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
    <div className="flex-1 overflow-hidden flex flex-col bg-surface-1/5">
      <div className="grid grid-cols-7 border-b border-border-subtle/50 flex-shrink-0 bg-surface-1/10 backdrop-blur-sm">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="p-4 text-center text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{d}</div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-7 min-h-full border-l border-t border-border-subtle/10">
          {days.map(day => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.start), day));
            const isCurrentMonth = isSameMonth(day, date);
            return (
              <div
                key={day.toString()}
                className={`border-r border-b border-border-subtle/10 p-3 min-h-[120px] transition-colors ${
                  !isCurrentMonth ? 'bg-surface-1/5 opacity-40' : ''
                } ${isToday(day) ? 'bg-accent-primary/[0.02]' : 'hover:bg-surface-1/20'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-xl transition-all ${
                    isToday(day) ? 'bg-accent-primary text-white shadow-blue' : isCurrentMonth ? 'text-text-secondary' : 'text-text-muted'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 4).map(event => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer hover:brightness-105 active:scale-95 transition-all truncate text-text-primary border-l-2"
                      style={{ backgroundColor: event.color + '15', borderColor: event.color }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 4 && (
                    <p className="text-[10px] font-bold text-text-muted px-2 mt-1 uppercase tracking-tighter">+{dayEvents.length - 4} more</p>
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
  const { tasks, fetchTasks, deleteTimeBlock } = useTaskStore();
  const { isGuest } = useAuthStore();

  useEffect(() => { fetchTasks(isGuest); }, [isGuest]);

  useEffect(() => {
    const evs = [];
    tasks.forEach(task => {
      (task.timeBlocks || []).forEach(block => {
        evs.push({
          id: block._id,
          title: block.title || task.title,
          start: block.startTime,
          end: block.endTime,
          color: block.color || task.color || '#3B82F6',
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ taskId: '', title: '', startTime: '', endTime: '', notes: '' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const openAddModal = (prefilledStart) => {
    const start = prefilledStart || new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
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

  const handleStartTimeChange = (newStartStr) => {
    setAddForm(f => {
      const newStart = new Date(newStartStr);
      const currentEnd = new Date(f.endTime);
      let newEndStr = f.endTime;
      if (isNaN(currentEnd.getTime()) || newStart >= currentEnd) {
        const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
        newEndStr = newEnd.toISOString().slice(0, 16);
      }
      return { ...f, startTime: newStartStr, endTime: newEndStr };
    });
  };

  const handleAddBlock = async (e) => {
    e.preventDefault();
    if (!addForm.taskId) { setAddError('Please select a task'); return; }
    if (new Date(addForm.startTime) >= new Date(addForm.endTime)) {
      setAddError('End time must be after start time');
      return;
    }
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
      setAddError(err.response?.data?.message || 'Conflict detected in schedule');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 md:px-10 py-5 border-b border-border-subtle bg-surface-1/10 backdrop-blur-md flex-shrink-0 gap-6">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          <div>
            <h1 className="text-2xl font-display font-black text-text-primary tracking-tight">Schedule</h1>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 px-1 border-l-2 border-accent-primary">{title}</p>
          </div>
          <div className="flex items-center gap-1 bg-surface-2/50 p-1 rounded-full border border-border-subtle/30 h-fit">
            <button onClick={() => navigate(-1)} className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-1 transition-all rounded-full">
              <ChevronLeft size={16} />
            </button>
            <button
               onClick={() => setCurrentDate(new Date())}
               className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-primary transition-all hover:bg-surface-1 rounded-full"
            >
              Today
            </button>
            <button onClick={() => navigate(1)} className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-1 transition-all rounded-full">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 h-fit">
          <div className="flex items-center bg-surface-2/50 p-1 rounded-full border border-border-subtle/30">
            {['week', 'month'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${
                  view === v ? 'bg-accent-primary text-white shadow-blue' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => openAddModal()} className="btn-primary flex items-center gap-2 px-6 py-3 shadow-blue">
            <Plus size={16} strokeWidth={3} /> <span className="font-bold uppercase tracking-widest text-[10px]">Schedule</span>
          </button>
        </div>
      </div>

      {/* Calendar Area */}
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

      {/* Detail Modals */}
      {selectedEvent && (
        <TimeBlockEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteEvent}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div className="bg-bg-secondary border border-border-subtle rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-display font-black text-xl text-text-primary tracking-tight">Schedule Block</h3>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Assign a task to a time slot</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn-secondary p-2.5 rounded-xl text-text-muted hover:text-text-primary transition-all">
                <X size={20} />
              </button>
            </div>
            
            {addError && (
              <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold uppercase tracking-widest">
                {addError}
              </div>
            )}
            
            <form onSubmit={handleAddBlock} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2.5">Select Task *</label>
                <select required className="input-field font-bold text-xs cursor-pointer" value={addForm.taskId} onChange={e => setAddForm(f => ({ ...f, taskId: e.target.value }))}>
                  <option value="" className="bg-bg-secondary">Choose activity...</option>
                  {tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').map(t => (
                    <option key={t._id} value={t._id} className="bg-bg-secondary">{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2.5">Label (Optional)</label>
                <input type="text" className="input-field text-sm font-medium" placeholder="e.g. Focus work" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2.5">Start</label>
                  <input type="datetime-local" required className="input-field text-xs font-bold" value={addForm.startTime} onChange={e => handleStartTimeChange(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2.5">End</label>
                  <input type="datetime-local" required className="input-field text-xs font-bold" value={addForm.endTime} onChange={e => setAddForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 py-4 font-bold uppercase tracking-widest text-[11px]">Cancel</button>
                <button type="submit" disabled={addLoading} className="btn-primary flex-1 py-4 font-bold uppercase tracking-widest text-[11px] shadow-blue">
                  {addLoading ? <Loader variant="spinner" size="sm" /> : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

