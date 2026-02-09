import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiPost, apiGet, apiPut, apiDelete } from '../api/client';
import type { AuthResponse, UserProfile } from '../types';

interface AuthContextType {
    user: { id: string; email: string; name: string } | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, name: string, password: string, consent: boolean) => Promise<void>;
    logout: () => void;
    getProfile: () => Promise<UserProfile>;
    updateProfile: (data: { name: string; email: string }) => Promise<UserProfile>;
    deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const login = async (email: string, password: string) => {
        const data = await apiPost<AuthResponse>('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
    };

    const register = async (email: string, name: string, password: string, consent: boolean) => {
        const data = await apiPost<AuthResponse>('/auth/register', { email, name, password, consent });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const getProfile = () => apiGet<UserProfile>('/auth/profile');

    const updateProfile = async (data: { name: string; email: string }) => {
        const profile = await apiPut<UserProfile>('/auth/profile', data);
        const updatedUser = { id: profile.id, email: profile.email, name: profile.name };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return profile;
    };

    const deleteAccount = async () => {
        await apiDelete('/auth/profile');
        logout();
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, getProfile, updateProfile, deleteAccount }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}