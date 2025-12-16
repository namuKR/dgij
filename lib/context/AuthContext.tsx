'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, USERS, Role } from '@/lib/mockData';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    login: (name: string, password?: string, role?: Role) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Check localStorage or session on mount
        const storedUser = localStorage.getItem('dgij_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('dgij_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (name: string, password?: string, role: Role = 'student') => {
        // Simple validation against mock data
        const foundUser = USERS.find(u => u.name === name && u.role === role);

        if (foundUser) {
            if (foundUser.password && foundUser.password !== password) {
                return false;
            }
            setUser(foundUser);
            localStorage.setItem('dgij_user', JSON.stringify(foundUser));
            router.push('/');
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('dgij_user');
        router.push('/login');
    };

    // Protected route logic (Basic)
    useEffect(() => {
        const isAuthPage = pathname?.startsWith('/login');
        if (!isLoading && !user && !isAuthPage) {
            router.push('/login');
        }
    }, [user, pathname, router, isLoading]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
