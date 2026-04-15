import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, MessageSquare, UserPlus, AlertCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../api/client';
import { useSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const socket = useSocket();

  useEffect(() => {
    fetchNotifications();
    
    const handleNewNote = ({ notification }) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      // Optional: Sound or Toast?
      toast((t) => (
        <span className="text-xs font-bold uppercase tracking-tight flex items-center gap-2">
          <Bell size={14} className="text-accent-primary" />
          New Notification: {notification.type.replace('_', ' ')}
        </span>
      ), { duration: 3000 });
    };

    socket.on('notification-received', handleNewNote);
    return () => socket.off('notification-received', handleNewNote);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.notifications.filter(n => !n.isRead).length);
    } catch (err) {}
    setLoading(false);
  };

  const navigate = useNavigate();

  const handleNoteClick = (note) => {
    if (!note.isRead) markAsRead(note._id);
    if (note.task) {
      navigate(`/tasks?highlight=${note.task._id}`);
      setShowDropdown(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {}
  };

  const deleteNote = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n._id !== id));
      const wasUnread = notifications.find(n => n._id === id && !n.isRead);
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const getIcon = (type) => {
    switch (type) {
      case 'task_assigned': return <UserPlus size={14} className="text-success" />;
      case 'comment_added': return <MessageSquare size={14} className="text-accent-primary" />;
      default: return <AlertCircle size={14} className="text-warning" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative p-2.5 rounded-xl transition-all group active:scale-95 ${
          showDropdown ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-muted hover:text-text-primary hover:bg-surface-2'
        }`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-accent-primary rounded-full border-2 border-bg-primary animate-pulse" />
        )}
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-3 w-[360px] max-h-[500px] bg-bg-secondary border border-border-subtle rounded-2xl shadow-premium z-50 overflow-hidden flex flex-col animate-slide-up">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-1/10">
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-text-primary">Alert Center</h4>
              <p className="text-[10px] text-text-muted font-bold mt-1">{unreadCount} UNREAD MESSAGES</p>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-[9px] font-black uppercase tracking-widest text-accent-primary hover:text-accent-hover transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar min-h-[100px]">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center animate-pulse">
                <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Accessing Logs...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center opacity-40">
                <Bell size={32} className="mx-auto mb-3 text-text-muted" />
                <p className="text-xs font-black uppercase tracking-widest italic">Signal is clear</p>
              </div>
            ) : (
              notifications.map(note => (
                <div 
                  key={note._id}
                  className={`group relative flex items-start gap-4 p-4 border-b border-border-subtle/30 transition-all hover:bg-surface-1/50 ${
                    !note.isRead ? 'bg-accent-primary/[0.02]' : 'opacity-80'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                    !note.isRead ? 'bg-accent-primary/10 border-accent-primary/20' : 'bg-surface-2 border-border-subtle'
                  }`}>
                    {getIcon(note.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0" onClick={() => handleNoteClick(note)}>
                    <div className="flex items-center justify-between gap-2">
                       <span className="text-[10px] font-black uppercase tracking-tighter text-text-primary truncate">
                        {note.sender?.name || 'System'}
                       </span>
                       <span className="text-[9px] font-bold text-text-muted uppercase whitespace-nowrap">
                        {format(new Date(note.createdAt), 'h:mm a')}
                       </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {note.content}
                    </p>
                    {note.task && (
                      <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 bg-surface-2 rounded-lg border border-border-subtle w-fit">
                        <Check size={8} className="text-accent-primary" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-text-muted">{note.task.title}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {!note.isRead && (
                      <button 
                        onClick={() => markAsRead(note._id)}
                        className="p-1.5 text-success hover:bg-success/10 rounded-lg"
                        title="Mark read"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNote(note._id)}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {!note.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent-primary shadow-blue" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="px-5 py-3 border-t border-border-subtle bg-surface-1/5 text-center">
             <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">End of transmissions</span>
          </div>
        </div>
      )}
    </div>
  );
}
