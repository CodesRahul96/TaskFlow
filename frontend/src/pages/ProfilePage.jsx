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
    { key: 'profile', label: 'Profile' },
    { key: 'security', label: 'Security' },
    { key: 'friends', label: 'Friends' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-xl md:text-2xl font-display font-bold text-text-primary mb-6">Settings</h1>

      <div className="flex border-b border-border-subtle mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key === 'friends') loadFriends(); }}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              tab === t.key ? 'text-accent-glow border-b-2 border-accent-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card space-y-5">
          <div className="flex items-center gap-4 pb-5 border-b border-border-subtle">
            <div className="w-16 h-16 rounded-2xl bg-accent-primary flex items-center justify-center text-white text-2xl font-bold shadow-glow">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-semibold text-text-primary text-lg">{user?.name}</p>
              <p className="text-text-muted text-sm">{user?.email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Display Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" className="input-field pl-9" value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="email" className="input-field pl-9" value={user?.email} disabled />
            </div>
            <p className="text-xs text-text-muted mt-1">Email cannot be changed</p>
          </div>

          <button onClick={handleProfileSave} disabled={loading} className="btn-primary w-full">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {tab === 'security' && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-text-primary text-lg">2-Step Verification</h2>
              <p className="text-text-muted text-sm mt-1">Add an extra layer of security to your account</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user?.mfaEnabled ? 'bg-neon-green/10 text-neon-green border border-neon-green/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {user?.mfaEnabled ? 'Protected' : 'Unprotected'}
            </div>
          </div>

          {!user?.mfaEnabled ? (
            !mfaSetupData ? (
              <div className="bg-surface-1 rounded-xl p-5 border border-border-subtle text-center">
                <Lock className="w-12 h-12 text-accent-primary mx-auto mb-3 opacity-50" />
                <p className="text-text-secondary text-sm mb-4">Protect your account with a secondary authentication code from apps like Google Authenticator.</p>
                <button onClick={handleMfaInit} disabled={loading} className="btn-primary w-full py-3">
                  {loading ? 'Initializing...' : 'Enable 2FA'}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-4 rounded-2xl inline-block mx-auto border-4 border-accent-primary/20 shadow-glow">
                  <img src={mfaSetupData.qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                </div>
                
                <div className="text-left space-y-3">
                  <p className="text-sm font-medium text-text-primary">1. Scan this QR code in your auth app</p>
                  <p className="text-xs text-text-muted bg-surface-1 p-2 rounded border border-border-subtle break-all font-mono">
                    Secret Key: <span className="text-accent-glow select-all">{mfaSetupData.secret}</span>
                  </p>
                  <p className="text-sm font-medium text-text-primary pt-2">2. Enter the 6-digit verification code</p>
                  <input
                    type="text"
                    className="input-field text-center text-xl tracking-widest font-mono"
                    placeholder="000000"
                    maxLength={6}
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setMfaSetupData(null)} className="flex-1 px-4 py-3 rounded-xl border border-border-default text-text-secondary text-sm font-medium hover:bg-surface-1 transition-all">
                     Cancel
                   </button>
                   <button onClick={handleMfaVerify} disabled={loading || mfaCode.length !== 6} className="flex-[2] btn-primary py-3">
                     {loading ? 'Verifying...' : 'Verify & Enable'}
                   </button>
                </div>
              </div>
            )
          ) : (
            <div className="bg-surface-1 rounded-xl p-5 border border-border-subtle">
               <div className="flex items-start gap-4 mb-4">
                 <div className="p-3 bg-neon-green/10 rounded-xl text-neon-green">
                   <Check size={24} />
                 </div>
                 <div>
                   <h3 className="font-semibold text-text-primary">Authenticator App Active</h3>
                   <p className="text-text-muted text-xs mt-0.5">Your account is secured with 2FA.</p>
                 </div>
               </div>
               <button onClick={handleMfaDisable} disabled={loading} className="w-full py-2.5 rounded-lg border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-all uppercase tracking-widest">
                 {loading ? 'Processing...' : 'Disable 2-Step Verification'}
               </button>
            </div>
          )}
        </div>
      )}

      {tab === 'friends' && (
        <div className="space-y-5">
          {/* Friend requests */}
          {friendRequests.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-3">Friend Requests</h3>
              <div className="space-y-2">
                {friendRequests.map(req => (
                  <div key={req._id} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white text-xs font-bold">
                      {req.from?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{req.from?.name}</p>
                      <p className="text-xs text-text-muted">{req.from?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => respondRequest(req._id, 'accept')} className="p-1.5 rounded-lg bg-neon-green/20 text-neon-green hover:bg-neon-green/30 transition-all">
                        <Check size={14} />
                      </button>
                      <button onClick={() => respondRequest(req._id, 'reject')} className="p-1.5 rounded-lg bg-neon-red/20 text-neon-red hover:bg-neon-red/30 transition-all">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-3">Add Friends</h3>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field text-sm flex-1"
                placeholder="Search by name or email..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') searchUsers(); }}
              />
              <button onClick={searchUsers} className="btn-primary px-3">
                <Search size={16} />
              </button>
            </div>
            {foundUsers.length > 0 && (
              <div className="mt-3 space-y-2">
                {foundUsers.map(u => (
                  <div key={u._id} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-neon-purple/30 flex items-center justify-center text-neon-purple text-xs font-bold">
                      {u.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{u.name}</p>
                      <p className="text-xs text-text-muted">{u.email}</p>
                    </div>
                    <button
                      onClick={() => sendRequest(u._id)}
                      className="p-1.5 rounded-lg bg-accent-primary/20 text-accent-glow hover:bg-accent-primary/30 transition-all"
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Friends list */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Users size={16} /> Friends ({friends.length})
            </h3>
            {friends.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">No friends yet. Search to add!</p>
            ) : (
              <div className="space-y-2">
                {friends.map(f => (
                  <div key={f._id} className="flex items-center gap-3 py-1.5">
                    <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan text-xs font-bold">
                      {f.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{f.name}</p>
                      <p className="text-xs text-text-muted">{f.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
