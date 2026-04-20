import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Sparkles, MessageSquare, Trash2, Loader2, MinusCircle, Maximize2 } from 'lucide-react';
import useAiStore from '../../store/aiStore';
import { format } from 'date-fns';

export default function AICompanion() {
    const { history, loading, isOpen, setIsOpen, sendMessage, clearHistory } = useAiStore();
    const [input, setInput] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, loading]);

    const handleSend = () => {
        if (!input.trim() || loading) return;
        sendMessage(input);
        setInput('');
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-10 right-10 w-16 h-16 bg-accent-primary rounded-2xl flex items-center justify-center text-white shadow-blue hover:scale-110 active:scale-95 transition-all z-50 group overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Bot className="relative z-10 w-8 h-8 group-hover:rotate-12 transition-transform" />
                <div className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-accent-primary border-2 border-bg-primary"></span>
                </div>
            </button>
        );
    }

    return (
        <div 
            className={`fixed bottom-10 right-10 w-[420px] max-w-[calc(100vw-40px)] bg-bg-secondary/80 backdrop-blur-3xl border border-border-subtle rounded-[2.5rem] shadow-premium z-50 flex flex-col transition-all duration-500 ease-out ${
                isMinimized ? 'h-20' : 'h-[650px] max-h-[80vh]'
            }`}
        >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-border-subtle/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-primary/10 rounded-xl flex items-center justify-center border border-accent-primary/20">
                        <Sparkles className="w-5 h-5 text-accent-primary animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-text-primary tracking-tight leading-none uppercase">Neural Synergy</h3>
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                            Online • Context Aware
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={clearHistory} className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all" title="Wipe Memory">
                        <Trash2 size={16} />
                    </button>
                    <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-2 rounded-xl transition-all">
                        {isMinimized ? <Maximize2 size={16} /> : <MinusCircle size={16} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Chat Body */}
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar scrolling-touch"
                    >
                        {history.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10 scale-95 transition-all">
                                <div className="w-20 h-20 bg-surface-1 rounded-[2rem] flex items-center justify-center mb-6">
                                    <MessageSquare size={40} className="text-text-muted" />
                                </div>
                                <h4 className="text-lg font-black text-text-primary tracking-tight mb-2 uppercase">Core Initialized</h4>
                                <p className="text-xs font-medium text-text-muted max-w-xs leading-relaxed">
                                    Ask me about your workflow, priorities, or task breakdowns. I have indexed your current workspace.
                                </p>
                            </div>
                        ) : (
                            history.map((msg, i) => (
                                <div 
                                    key={i} 
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                                >
                                    <div 
                                        className={`max-w-[85%] rounded-[1.5rem] p-4 text-sm leading-relaxed ${
                                            msg.role === 'user' 
                                                ? 'bg-accent-primary text-white shadow-blue rounded-tr-none' 
                                                : 'bg-surface-1 border border-border-subtle text-text-primary rounded-tl-none font-medium'
                                        }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-surface-1 border border-border-subtle rounded-[1.5rem] rounded-tl-none p-4 flex items-center gap-3">
                                    <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Synchronizing Neurons...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 pt-0">
                        <div className="relative group">
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Sync with AI Command..." 
                                className="w-full bg-surface-1/50 border border-border-subtle rounded-2xl pl-6 pr-16 py-4 text-sm font-medium text-text-primary focus:border-accent-primary transition-all outline-none backdrop-blur-md"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center text-white shadow-blue hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <p className="text-[8px] text-center font-bold text-text-muted mt-4 uppercase tracking-[0.2em] opacity-40">
                             Industrial-Grade Intelligence • v1.0.0
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
