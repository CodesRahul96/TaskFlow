import { create } from 'zustand';
import api from '../api/client';

const useAiStore = create((set, get) => ({
    history: [],
    loading: false,
    isOpen: false,

    setIsOpen: (isOpen) => set({ isOpen }),
    
    clearHistory: () => set({ history: [] }),

    sendMessage: async (content) => {
        if (!content.trim()) return;

        const userMessage = { role: 'user', content };
        set(state => ({ 
            history: [...state.history, userMessage],
            loading: true 
        }));

        try {
            const { data } = await api.post('/ai/chat', { 
                message: content,
                history: get().history.slice(0, -1) // Current user msg added above, send prev history
            });

            const aiMessage = { role: 'assistant', content: data.content };
            set(state => ({ 
                history: [...state.history, aiMessage],
                loading: false 
            }));
        } catch (error) {
            const serverMessage = error.response?.data?.message || error.response?.data?.content;
            const errorMessage = { 
                role: 'assistant', 
                content: serverMessage || "System alert: Neural gateway timed out. Please check your connectivity or try again in a few moments." 
            };
            set(state => ({ 
                history: [...state.history, errorMessage],
                loading: false 
            }));
        }
    }
}));

export default useAiStore;
