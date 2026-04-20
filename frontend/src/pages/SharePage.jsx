import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, UserPlus, Clock, Tag, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';
import api from '../api/client';
import useTaskStore from '../store/taskStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import useAuthStore from '../store/authStore';

const SharePage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { joinTaskByToken } = useTaskStore();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPublicTask = async () => {
            try {
                const { data } = await api.get(`/tasks/public/${token}`);
                setTask(data.task);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load shared task');
            } finally {
                setLoading(false);
            }
        };
        fetchPublicTask();
    }, [token]);

    const handleJoin = async () => {
        if (user) {
            // If already logged in, join immediately
            const result = await joinTaskByToken(token);
            if (result.success) {
                navigate('/');
            }
        } else {
            // If not logged in, save token and go to register
            localStorage.setItem('tf_pending_invite', token);
            toast.success('Join request saved! Please register to continue.');
            navigate('/register');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 text-center">
                <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="bg-red-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Share2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
                    <p className="text-slate-400 mb-8">{error}</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold transition-all duration-300"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const priorityColors = {
        low: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20',
        medium: 'bg-blue-500/20 text-blue-500 border-blue-500/20',
        high: 'bg-orange-500/20 text-orange-400 border-orange-500/20',
        urgent: 'bg-red-500/20 text-red-500 border-red-500/20',
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-indigo-500/30 overflow-hidden relative">
            {/* Background Decorative Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />

            <div className="container mx-auto px-4 py-12 lg:py-20 flex flex-col items-center justify-center relative z-10 min-h-screen">
                <div className="w-full max-w-2xl">
                    
                    {/* Brand Header */}
                    <div className="flex items-center justify-center gap-3 mb-12 opacity-80">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <span className="text-white font-black text-xl">t</span>
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter">taskflow</span>
                    </div>

                    {/* Task Card */}
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                        {/* Status Ribbon */}
                        <div className="absolute top-0 right-0 px-6 py-2 bg-indigo-600/20 border-b border-l border-white/10 rounded-bl-3xl text-indigo-400 text-sm font-bold uppercase tracking-widest">
                            Invitation
                        </div>

                        <div className="bg-indigo-600/10 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                            <ShieldCheck className="w-10 h-10 text-indigo-500" />
                        </div>

                        <div className="text-center space-y-4">
                            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight uppercase">
                                {task.title || 'Private Invitation'}
                            </h1>
                            <div className="flex justify-center">
                                <span className="px-4 py-1.5 bg-white/10 border border-white/10 rounded-full text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                                    Status: {task.status || 'Active'}
                                </span>
                            </div>
                            <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto">
                                <span className="font-bold text-indigo-400">{task.owner?.name || 'A TaskFlow user'}</span> has invited you to collaborate on a private task.
                            </p>
                        </div>

                        <div className="mt-12 p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 backdrop-blur-sm relative group">
                            <div className="flex items-center gap-4 text-left">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shared On</p>
                                    <p className="text-white font-bold">{format(new Date(task.createdAt), 'MMMM dd, yyyy')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-12 flex flex-col sm:flex-row gap-4">
                            <button 
                                onClick={handleJoin}
                                className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 group"
                            >
                                {user ? 'Accept Invite & View' : 'Register to View'}
                                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button 
                                onClick={() => navigate('/')}
                                className="px-8 py-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-bold transition-all duration-300 border border-white/5"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <ShieldCheck className="w-4 h-4 text-indigo-500/50" />
                        Secure collaborative link provided by taskflow
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SharePage;
