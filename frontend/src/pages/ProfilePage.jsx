import { useState } from 'react';
import { User, Mail, Lock, Users, Search, UserPlus, Check, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../api/client';
import toast from 'react-hot-toast';
import Loader from '../components/ui/Loader';

export default function ProfilePage() {
  const { user, updateProfile, setupMFA, verifyMFASetup, disableMFA } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState(null); // { qrCodeUrl, secret }
  const [mfaCode, setMfaCode] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [tab, setTab] = useState('profile');

  const handleProfileSave = async () => {
    setLoading(true);
    await updateProfile({ name });
    setLoading(false);
  };

  const handleMfaInit = async () => {
    setLoading(true);
    const res = await setupMFA();
    if (res.success) setMfaSetupData(res.data);
    setLoading(false);
  };

  const handleMfaVerify = async () => {
    if (!mfaCode) return toast.error('Enter the code');
    setLoading(true);
    const res = await verifyMFASetup(mfaCode);
    if (res.success) {
       setMfaSetupData(null);
       setMfaCode('');
    }
    setLoading(false);
  };

  const handleMfaDisable = async () => {
    if (!window.confirm('Are you sure you want to disable MFA?')) return;
    setLoading(true);
    await disableMFA();
    setLoading(false);
  };

  const searchUsers = async () => {
    if (!searchQ) return;
    try {
      const { data } = await api.get(`/users/search?q=${searchQ}`);
      setFoundUsers(data.users);
    } catch { setFoundUsers([]); }
  };

  const sendRequest = async (userId) => {
    try {
      await api.post(`/users/friend-request/${userId}`);
      toast.success('Friend request sent!');
      setFoundUsers(f => f.filter(u => u._id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const loadFriends = async () => {
    try {
      const { data } = await api.get('/users/friends');
      setFriends(data.friends);
      setFriendRequests(data.friendRequests.filter(r => r.status === 'pending'));
    } catch { }
  };

  const respondRequest = async (requestId, action) => {
    try {
      await api.put(`/users/friend-request/${requestId}/respond`, { action });
      toast.success(action === 'accept' ? 'Friend added!' : 'Request declined');
      loadFriends();
    } catch { }
  };

  const tabs = [
    { key: 'profile', label: 'Identity' },
    { key: 'security', label: 'Security' },
    { key: 'friends', label: 'Network' },
  ];

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">Settings</h1>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-2 px-1 border-l-2 border-accent-primary">Management Workspace</p>
      </div>

      <div className="flex px-2 border-b border-border-subtle mb-10 overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key === 'friends') loadFriends(); }}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
              tab === t.key ? 'text-accent-primary' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
            {tab === t.key && (
              <div className="absolute bottom-0 left-6 right-6 h-1 bg-accent-primary rounded-t-full shadow-blue" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {tab === 'profile' && (
          <div className="card md:p-10 space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center gap-8 pb-10 border-b border-border-subtle/50">
              <div className="w-24 h-24 rounded-3xl bg-accent-primary/10 border-4 border-accent-primary/20 flex items-center justify-center text-accent-primary text-4xl font-black shadow-sm">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="text-center sm:text-left">
                <p className="font-display font-black text-2xl text-text-primary tracking-tight leading-none mb-2">{user?.name}</p>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Mail size={14} className="text-text-muted" />
                  <p className="text-text-muted font-bold text-xs uppercase tracking-widest">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-3">Display Name</label>
                <div className="relative group">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                  <input type="text" className="input-field pl-12 font-bold" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-3">Account Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted opacity-50" />
                  <input type="email" className="input-field pl-12 opacity-50 cursor-not-allowed font-medium" value={user?.email} disabled />
                </div>
              </div>
            </div>

            <button onClick={handleProfileSave} disabled={loading} className="btn-primary w-full py-4 font-bold uppercase tracking-widest text-[11px] shadow-blue mt-4">
              {loading ? 'Processing changes...' : 'Save Identity'}
            </button>
          </div>
        )}

        {tab === 'security' && (
          <div className="card md:p-10 space-y-10 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border-subtle/50">
              <div>
                <h2 className="font-display font-black text-2xl text-text-primary tracking-tight">2-Step Verification</h2>
                <p className="text-text-muted text-xs font-medium mt-1 leading-relaxed">Enhance account security with cross-platform authentication.</p>
              </div>
              <div className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border h-fit ${user?.mfaEnabled ? 'bg-success/10 text-success border-success/20 shadow-sm' : 'bg-danger/10 text-danger border-danger/20'}`}>
                {user?.mfaEnabled ? 'ENFORCED' : 'DISABLED'}
              </div>
            </div>

            {!user?.mfaEnabled ? (
              !mfaSetupData ? (
                <div className="bg-surface-1/5 rounded-3xl p-10 border border-dashed border-border-subtle/50 text-center">
                  <div className="w-20 h-20 bg-surface-2 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-border-subtle shadow-sm">
                    <Lock className="w-10 h-10 text-accent-primary" />
                  </div>
                  <p className="text-text-secondary font-bold text-sm mb-8 max-w-sm mx-auto leading-relaxed">Protect your workspace from unauthorized access using Google Authenticator or similar tools.</p>
                  <button onClick={handleMfaInit} disabled={loading} className="btn-primary px-10 py-4 font-bold uppercase tracking-widest text-[11px] shadow-blue">
                    {loading ? 'Initializing Protocol...' : 'Activate 2FA'}
                  </button>
                </div>
              ) : (
                <div className="space-y-10 animate-fade-in max-w-md mx-auto">
                  <div className="bg-white p-6 rounded-[2.5rem] inline-block w-full border border-border-subtle shadow-2xl relative overflow-hidden group">
                     <div className="absolute inset-0 bg-accent-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                     <img src={mfaSetupData.qrCodeUrl} alt="MFA QR Code" className="w-full h-auto rounded-3xl relative z-10" />
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                       <span className="w-6 h-6 rounded-lg bg-accent-primary text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">1</span>
                       <p className="text-xs font-bold text-text-primary uppercase tracking-wider leading-relaxed pt-1">Scan the visual signature in your authenticator app.</p>
                    </div>

                    <div className="bg-surface-2 p-5 rounded-2xl border border-border-subtle/50 group">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Secret Access Token</p>
                      <p className="text-xs font-mono text-accent-primary select-all break-all tracking-wider font-bold">
                        {mfaSetupData.secret}
                      </p>
                    </div>

                    <div className="flex items-start gap-4">
                       <span className="w-6 h-6 rounded-lg bg-accent-primary text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">2</span>
                       <div className="flex-1">
                          <p className="text-xs font-bold text-text-primary uppercase tracking-wider leading-relaxed pt-1 mb-4">Input the 6-digit sync code below.</p>
                          <input
                            type="text"
                            className="input-field text-center text-3xl tracking-[0.3em] font-black h-20"
                            placeholder="000 000"
                            maxLength={6}
                            value={mfaCode}
                            onChange={e => setMfaCode(e.target.value)}
                          />
                       </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                     <button onClick={() => setMfaSetupData(null)} className="btn-secondary flex-1 py-4 font-bold uppercase tracking-widest text-[11px]">
                       Abandon
                     </button>
                     <button onClick={handleMfaVerify} disabled={loading || mfaCode.length !== 6} className="btn-primary flex-[2] py-4 font-bold uppercase tracking-widest text-[11px] shadow-blue">
                       {loading ? 'Verifying...' : 'Finalize Sync'}
                     </button>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-success/[0.03] rounded-3xl p-8 border border-success/20">
                 <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 text-center sm:text-left">
                   <div className="p-5 bg-success rounded-2xl text-white shadow-lg shadow-success/20">
                     <Check size={28} strokeWidth={3} />
                   </div>
                   <div>
                     <h3 className="font-display font-black text-xl text-text-primary tracking-tight">Security Hardened</h3>
                     <p className="text-text-muted text-xs font-medium mt-1">Your account is fortified with cryptographic MFA.</p>
                   </div>
                 </div>
                 <button onClick={handleMfaDisable} disabled={loading} className="w-full btn-secondary text-danger border-danger/20 hover:bg-danger/10 py-4 font-bold uppercase tracking-widest text-[10px]">
                   {loading ? 'Processing...' : 'Disable Security Protocol'}
                 </button>
              </div>
            )}
          </div>
        )}

        {tab === 'friends' && (
          <div className="space-y-8 animate-fade-in">
            {/* Friend requests */}
            {friendRequests.length > 0 && (
              <div className="card md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="font-display font-black text-xl text-text-primary tracking-tight">Pending Syncs</h3>
                  <span className="px-2 py-0.5 bg-accent-primary text-white text-[10px] font-black rounded-lg">{friendRequests.length}</span>
                </div>
                <div className="space-y-3">
                  {friendRequests.map(req => (
                    <div key={req._id} className="flex items-center gap-4 p-4 bg-surface-1/40 rounded-2xl border border-border-subtle/50 group">
                      <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-black text-lg">
                        {req.from?.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary uppercase tracking-tight truncate">{req.from?.name}</p>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{req.from?.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => respondRequest(req._id, 'accept')} className="p-2.5 rounded-xl bg-success/10 text-success hover:bg-success hover:text-white transition-all shadow-sm">
                          <Check size={18} strokeWidth={3} />
                        </button>
                        <button onClick={() => respondRequest(req._id, 'reject')} className="p-2.5 rounded-xl bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all shadow-sm">
                          <X size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Search */}
              <div className="card md:p-8 flex flex-col">
                <h3 className="font-display font-black text-xl text-text-primary tracking-tight mb-6 flex items-center gap-3">
                   Discover
                </h3>
                <div className="flex gap-3 mb-6">
                  <div className="relative flex-1 group">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                    <input
                      type="text"
                      className="input-field pl-12 text-sm"
                      placeholder="Name or email..."
                      value={searchQ}
                      onChange={e => setSearchQ(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') searchUsers(); }}
                    />
                  </div>
                  <button onClick={searchUsers} className="btn-primary w-12 h-12 flex items-center justify-center p-0 rounded-xl flex-shrink-0 shadow-blue">
                    <Search size={20} strokeWidth={3} />
                  </button>
                </div>
                <div className="flex-1 space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                  {foundUsers.length === 0 && searchQ && !loading && (
                    <div className="text-center py-10 opacity-30">
                       <p className="text-[10px] font-black uppercase tracking-widest">No users found</p>
                    </div>
                  )}
                  {foundUsers.map(u => (
                    <div key={u._id} className="flex items-center gap-4 p-4 bg-surface-1/40 hover:bg-surface-1/60 rounded-2xl border border-border-subtle/30 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle/50 flex items-center justify-center text-text-secondary font-black text-sm group-hover:bg-accent-primary group-hover:text-white transition-all">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary uppercase tracking-tight truncate">{u.name}</p>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest truncate">{u.email}</p>
                      </div>
                      <button
                        onClick={() => sendRequest(u._id)}
                        className="p-2.5 rounded-xl bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white transition-all"
                      >
                        <UserPlus size={18} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Friends list */}
              <div className="card md:p-8 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="font-display font-black text-xl text-text-primary tracking-tight">Network</h3>
                   <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{friends.length} EXPERTS</span>
                </div>
                <div className="flex-1 space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                  {friends.length === 0 ? (
                    <div className="text-center py-20 opacity-20 border-2 border-dashed border-border-subtle/20 rounded-3xl">
                      <Users size={40} className="mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest leading-loose">Launch a search to<br/>expand your workspace</p>
                    </div>
                  ) : (
                    friends.map(f => (
                      <div key={f._id} className="flex items-center gap-4 p-4 bg-surface-1/40 rounded-2xl border border-border-subtle/30 hover:border-accent-primary/30 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-accent-primary/5 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-black text-sm group-hover:bg-accent-primary group-hover:text-white transition-all">
                          {f.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-text-primary uppercase tracking-tight truncate">{f.name}</p>
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest truncate">{f.email}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-success shadow-sm opacity-50" title="Synchronized" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

