import { create } from 'zustand';

interface User {
    userId: string;
    fullName: string;
    email: string;
    role: 'TRAVELER' | 'PROVIDER' | 'ADMIN';
    premiumStatus: boolean;
}

interface SessionState {
    user: User | null;
    isLoading: boolean;
    token: string | null;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    user: null,
    isLoading: false,
    token: null,
    setUser: (user) => set({ user }),
    setToken: (token) => set({ token }),
    setLoading: (isLoading) => set({ isLoading }),
    logout: () => set({ user: null, token: null }),
}));
