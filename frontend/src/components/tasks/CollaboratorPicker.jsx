import { useState, useEffect } from 'react';
import { Search, UserPlus, X, Check, User } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function CollaboratorPicker({ currentCollaborators = [], onAdd, onRemove, isOwner }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await api.get(`/users/search?q=${query}`);
        // Filter out those already added
        const filtered = data.users.filter(u => 
          !currentCollaborators.some(c => c._id === u._id)
        );
        setResults(filtered);
      } catch (err) {
        toast.error('Search failed');
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, currentCollaborators]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Teams & Collaborators</h3>
        <span className="text-[10px] font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-lg">
          {currentCollaborators.length} ACTIVE
        </span>
      </div>

      {/* Current Collaborators */}
      <div className="flex flex-wrap gap-2">
        {currentCollaborators.map(user => (
          <div 
            key={user._id} 
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 bg-surface-2 border border-border-subtle rounded-xl group hover:border-accent-primary transition-all"
          >
            <div className="w-6 h-6 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary text-[10px] font-black">
              {user.name[0].toUpperCase()}
            </div>
            <span className="text-xs font-bold text-text-secondary">{user.name}</span>
            {isOwner && (
              <button 
                onClick={() => onRemove(user._id)}
                className="text-text-muted hover:text-danger ml-1 p-0.5 rounded-md hover:bg-danger/10 transition-colors"
                title="Remove"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        {currentCollaborators.length === 0 && (
          <p className="text-[10px] italic text-text-muted py-2">Solo mission. No others assigned yet.</p>
        )}
      </div>

      {/* Search Input */}
      {isOwner && (
        <div className="relative group">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
            <input
              type="text"
              className="input-field pl-10 text-xs py-2.5 font-medium"
              placeholder="Invite by name or email..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
            />
          </div>

          {/* Results Dropdown */}
          {showDropdown && (query.length >= 2 || loading) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  No users found
                </div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto">
                  {results.map(user => (
                    <button
                      key={user._id}
                      onClick={() => {
                        onAdd(user);
                        setQuery('');
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent-primary/5 text-left transition-colors border-b border-border-subtle/30 last:border-0 group/item"
                    >
                      <div className="w-8 h-8 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted group-hover/item:text-accent-primary border border-border-subtle transition-colors">
                        <User size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text-primary uppercase truncate">{user.name}</p>
                        <p className="text-[10px] text-text-muted truncate lowercase">{user.email}</p>
                      </div>
                      <UserPlus size={14} className="text-text-muted group-hover/item:text-accent-primary opacity-0 group-hover/item:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
