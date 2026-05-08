import { memo, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  SortAsc, SortDesc, X, Calendar, Clock, Tag,
  AlertCircle, CheckCircle, Circle, Zap, ChevronDown,
  ChevronUp, Filter, RotateCcw, CalendarX, CalendarCheck,
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

/**
 * Premium Task Filter Panel
 * Full-featured filter & sort system for TasksPage.
 */

const SORT_OPTIONS = [
  { value: 'order',     label: 'Manual Order',   icon: '⠿' },
  { value: 'createdAt', label: 'Created Date',   icon: '📅' },
  { value: 'deadline',  label: 'Deadline',       icon: '⏰' },
  { value: 'priority',  label: 'Priority',       icon: '🔥' },
  { value: 'title',     label: 'Title (A–Z)',    icon: '🔤' },
  { value: 'updatedAt', label: 'Last Updated',   icon: '🔄' },
];

const STATUS_OPTIONS = [
  { value: '',           label: 'All',         cls: 'text-text-muted',    dot: 'bg-text-muted' },
  { value: 'todo',       label: 'Todo',        cls: 'text-text-secondary', dot: 'bg-text-secondary' },
  { value: 'in-progress',label: 'In Progress', cls: 'text-accent-primary', dot: 'bg-accent-primary' },
  { value: 'completed',  label: 'Completed',   cls: 'text-success',       dot: 'bg-success' },
  { value: 'cancelled',  label: 'Cancelled',   cls: 'text-danger',        dot: 'bg-danger' },
];

const PRIORITY_OPTIONS = [
  { value: '',       label: 'All',    color: '#718096' },
  { value: 'urgent', label: 'Urgent', color: '#EF4444' },
  { value: 'high',   label: 'High',   color: '#F59E0B' },
  { value: 'medium', label: 'Medium', color: '#3B82F6' },
  { value: 'low',    label: 'Low',    color: '#10B981' },
];

// ── Sub-components ──────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, label, collapsed, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between text-[9px] uppercase tracking-[0.18em] font-black text-text-muted mb-2 hover:text-text-primary transition-colors group"
  >
    <span className="flex items-center gap-2">
      <Icon size={11} className="text-accent-primary" />
      {label}
    </span>
    {collapsed ? <ChevronDown size={12} className="group-hover:text-accent-primary transition-colors" /> : <ChevronUp size={12} className="group-hover:text-accent-primary transition-colors" />}
  </button>
);

const SortDirButton = ({ dir, current, onClick }) => (
  <button
    onClick={() => onClick(dir)}
    title={dir === 'asc' ? 'Ascending' : 'Descending'}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
      current === dir
        ? 'bg-accent-primary text-white border-accent-primary shadow-blue'
        : 'bg-surface-2 text-text-muted border-border-default hover:border-accent-primary/40 hover:text-accent-primary'
    }`}
  >
    {dir === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />}
    {dir === 'asc' ? 'Asc' : 'Desc'}
  </button>
);

// ── Main Component ──────────────────────────────────────────────────────────

const TaskFilterPanel = memo(({ filters, setFilters, allTasks, onClose }) => {
  const [collapsed, setCollapsed] = useState({
    sort: false,
    quick: false,
    date: false,
    timeblock: false,
    status: false,
    priority: false,
    tags: false,
  });

  const toggleSection = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  // Derive all unique tags from current task list
  const allTags = useMemo(() => {
    const tagSet = new Set();
    allTasks.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)));
    return [...tagSet].sort();
  }, [allTasks]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggleTag = (tag) => {
    const cur = filters.tags || [];
    const next = cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag];
    setFilters({ tags: next });
  };

  const setQuickFilter = (key) => {
    // Quick filters are mutually exclusive
    setFilters({
      overdue: key === 'overdue' ? !filters.overdue : false,
      dueToday: key === 'dueToday' ? !filters.dueToday : false,
      noDeadline: key === 'noDeadline' ? !filters.noDeadline : false,
      // Clear date range when using quick filter
      ...(key !== 'none' ? { dateFrom: '', dateTo: '' } : {}),
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}>
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-border-subtle shadow-premium animate-filter-in bg-surface-1 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border-subtle bg-surface-2/30 flex-shrink-0">
          <h2 className="font-bold text-sm tracking-widest uppercase text-text-primary flex items-center gap-2">
            <Filter size={16} className="text-accent-primary"/> Advanced Filters
          </h2>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 md:p-5 overflow-y-auto no-scrollbar flex-1" style={{ background: 'rgba(var(--surface-1), 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      {/* ── SORT ────────────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <SectionHeader icon={SortAsc} label="Sort By" collapsed={collapsed.sort} onToggle={() => toggleSection('sort')} />
        {!collapsed.sort && (
          <div className="space-y-2">
            {/* Sort field */}
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilters({ sort: opt.value })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                    filters.sort === opt.value
                      ? 'bg-accent-primary text-white border-accent-primary shadow-blue'
                      : 'bg-surface-2/60 text-text-muted border-border-subtle hover:border-accent-primary/40 hover:text-accent-primary'
                  }`}
                >
                  <span className="text-[11px]">{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
            {/* Sort direction */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] uppercase tracking-wider text-text-muted font-black">Direction:</span>
              <SortDirButton dir="asc" current={filters.sortDir} onClick={d => setFilters({ sortDir: d })} />
              <SortDirButton dir="desc" current={filters.sortDir} onClick={d => setFilters({ sortDir: d })} />
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-border-subtle my-3" />

      {/* ── QUICK FILTERS ───────────────────────────────────────────────────── */}
      <div className="mb-4">
        <SectionHeader icon={Zap} label="Quick Filters" collapsed={collapsed.quick} onToggle={() => toggleSection('quick')} />
        {!collapsed.quick && (
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'overdue',    label: 'Overdue',      Icon: AlertCircle,   active: filters.overdue,    activeClass: 'bg-danger/10 text-danger border-danger/30' },
              { key: 'dueToday',   label: 'Due Today',    Icon: CalendarCheck, active: filters.dueToday,   activeClass: 'bg-warning/10 text-warning border-warning/30' },
              { key: 'noDeadline', label: 'No Deadline',  Icon: CalendarX,     active: filters.noDeadline, activeClass: 'bg-success/10 text-success border-success/30' },
            ].map(({ key, label, Icon, active, activeClass }) => (
              <button
                key={key}
                onClick={() => setQuickFilter(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  active
                    ? activeClass
                    : 'bg-surface-2/60 text-text-muted border-border-subtle hover:border-accent-primary/40 hover:text-accent-primary'
                }`}
              >
                <Icon size={11} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-border-subtle my-3" />

      {/* ── DATE RANGE ──────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <SectionHeader icon={Calendar} label="Deadline Range" collapsed={collapsed.date} onToggle={() => toggleSection('date')} />
        {!collapsed.date && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-text-muted block mb-1">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters({ dateFrom: e.target.value, overdue: false, dueToday: false, noDeadline: false })}
                className="input-field text-xs py-2"
                style={{ colorScheme: 'auto' }}
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-text-muted block mb-1">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters({ dateTo: e.target.value, overdue: false, dueToday: false, noDeadline: false })}
                className="input-field text-xs py-2"
                style={{ colorScheme: 'auto' }}
              />
            </div>
            {(filters.dateFrom || filters.dateTo) && (
              <button
                onClick={() => setFilters({ dateFrom: '', dateTo: '' })}
                className="col-span-2 text-[9px] uppercase tracking-wider text-text-muted hover:text-danger transition-colors flex items-center gap-1.5 justify-center"
              >
                <X size={10} /> Clear date range
              </button>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-border-subtle my-3" />

      {/* ── TIME BLOCK DATE ──────────────────────────────────────────────────── */}
      <div className="mb-4">
        <SectionHeader icon={Clock} label="Time Block Date" collapsed={collapsed.timeblock} onToggle={() => toggleSection('timeblock')} />
        {!collapsed.timeblock && (
          <div>
            <p className="text-[9px] text-text-muted mb-2 font-medium">Show tasks with a scheduled time block on:</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.timeBlockDate}
                onChange={e => setFilters({ timeBlockDate: e.target.value })}
                className="input-field text-xs py-2 flex-1"
                style={{ colorScheme: 'auto' }}
              />
              {filters.timeBlockDate && (
                <button
                  onClick={() => setFilters({ timeBlockDate: '' })}
                  className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 transition-all rounded-xl border border-transparent hover:border-danger/10"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-border-subtle my-3" />

      {/* ── STATUS PILLS ────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <SectionHeader icon={CheckCircle} label="Status" collapsed={collapsed.status} onToggle={() => toggleSection('status')} />
        {!collapsed.status && (
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilters({ status: opt.value })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  filters.status === opt.value
                    ? `${opt.cls} border-current bg-current/10 shadow-sm`
                    : 'bg-surface-2/60 text-text-muted border-border-subtle hover:border-accent-primary/40 hover:text-accent-primary'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${opt.dot} flex-shrink-0`} />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-border-subtle my-3" />

      {/* ── PRIORITY PILLS ──────────────────────────────────────────────────── */}
      <div className="mb-4">
        <SectionHeader icon={AlertCircle} label="Priority" collapsed={collapsed.priority} onToggle={() => toggleSection('priority')} />
        {!collapsed.priority && (
          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilters({ priority: opt.value })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  filters.priority === opt.value ? 'shadow-sm' : 'bg-surface-2/60 border-border-subtle'
                }`}
                style={
                  filters.priority === opt.value
                    ? { color: opt.color, borderColor: opt.color, backgroundColor: opt.color + '18' }
                    : {}
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAGS MULTI-SELECT ────────────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <>
          <div className="h-px bg-border-subtle my-3" />
          <div className="mb-2">
            <SectionHeader icon={Tag} label={`Tags (${allTags.length})`} collapsed={collapsed.tags} onToggle={() => toggleSection('tags')} />
            {!collapsed.tags && (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                {allTags.map(tag => {
                  const active = (filters.tags || []).includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                        active
                          ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/40 shadow-sm'
                          : 'bg-surface-2/60 text-text-muted border-border-subtle hover:border-accent-primary/30 hover:text-text-primary'
                      }`}
                    >
                      {active && <X size={9} />}
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-surface-2/50 flex justify-end flex-shrink-0">
           <button onClick={onClose} className="btn-primary py-2 px-6 w-full md:w-auto">Apply Filters</button>
        </div>
      </div>
    </div>,
    document.body
  );
});

TaskFilterPanel.displayName = 'TaskFilterPanel';

// ── Active Filter Chips (external component, used in TasksPage header) ──────

export const ActiveFilterChips = memo(({ filters, setFilters, onClearAll }) => {
  const chips = [];

  if (filters.status)
    chips.push({ key: 'status', label: `Status: ${filters.status}`, clear: () => setFilters({ status: '' }) });
  if (filters.priority)
    chips.push({ key: 'priority', label: `Priority: ${filters.priority}`, clear: () => setFilters({ priority: '' }) });
  if (filters.sort && filters.sort !== 'order')
    chips.push({ key: 'sort', label: `Sort: ${filters.sort} (${filters.sortDir})`, clear: () => setFilters({ sort: 'order', sortDir: 'asc' }) });
  if (filters.dateFrom)
    chips.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}`, clear: () => setFilters({ dateFrom: '' }) });
  if (filters.dateTo)
    chips.push({ key: 'dateTo', label: `To: ${filters.dateTo}`, clear: () => setFilters({ dateTo: '' }) });
  if (filters.timeBlockDate)
    chips.push({ key: 'timeBlockDate', label: `Time Block: ${filters.timeBlockDate}`, clear: () => setFilters({ timeBlockDate: '' }) });
  if (filters.overdue)
    chips.push({ key: 'overdue', label: 'Overdue', clear: () => setFilters({ overdue: false }) });
  if (filters.dueToday)
    chips.push({ key: 'dueToday', label: 'Due Today', clear: () => setFilters({ dueToday: false }) });
  if (filters.noDeadline)
    chips.push({ key: 'noDeadline', label: 'No Deadline', clear: () => setFilters({ noDeadline: false }) });
  (filters.tags || []).forEach(tag =>
    chips.push({ key: `tag:${tag}`, label: `#${tag}`, clear: () => setFilters({ tags: (filters.tags || []).filter(t => t !== tag) }) })
  );

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2.5 animate-filter-chips-in">
      {chips.map(chip => (
        <button
          key={chip.key}
          onClick={chip.clear}
          className="filter-chip group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
        >
          {chip.label}
          <X size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="text-[9px] uppercase tracking-wider text-text-muted hover:text-danger transition-colors font-black flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-danger/5 border border-transparent hover:border-danger/10"
      >
        <RotateCcw size={9} /> Clear all
      </button>
    </div>
  );
});

ActiveFilterChips.displayName = 'ActiveFilterChips';

// ── Filter Count Badge ───────────────────────────────────────────────────────

export const getActiveFilterCount = (filters) => {
  let count = 0;
  if (filters.status) count++;
  if (filters.priority) count++;
  if (filters.sort && filters.sort !== 'order') count++;
  if (filters.dateFrom) count++;
  if (filters.dateTo) count++;
  if (filters.timeBlockDate) count++;
  if (filters.overdue) count++;
  if (filters.dueToday) count++;
  if (filters.noDeadline) count++;
  count += (filters.tags || []).length;
  return count;
};

export default TaskFilterPanel;
