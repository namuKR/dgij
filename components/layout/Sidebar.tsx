'use client';

import React from 'react';
import { Home, PenTool, BarChart2, User, BookOpen, LogOut, BookX } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/context/AuthContext';

export function Sidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();

    if (pathname?.startsWith('/login') || pathname?.startsWith('/admin')) return null;

    const navItems = [
        { href: '/', label: '홈', icon: Home },
        { href: '/contents', label: '컨텐츠', icon: BookOpen },
        { href: '/wrong-answers', label: '오답노트', icon: BookX },
        // { href: '/analytics', label: '성적분석', icon: BarChart2 },
        { href: '/profile', label: '내 정보', icon: User },
    ];

    return (
        <aside className="hidden md:flex flex-col w-16 h-screen border-r bg-background fixed left-0 top-0 z-50">
            <div className="flex-1 flex flex-col justify-center space-y-4 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center justify-center p-3 rounded-lg transition-colors",
                                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                            )}
                            title={item.label}
                        >
                            <Icon size={24} />
                        </Link>
                    )
                })}
            </div>

            <div className="p-2 border-t mt-auto mb-4">
                <button
                    onClick={logout}
                    className="flex items-center justify-center w-full p-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                    <LogOut size={24} />
                </button>
            </div>
        </aside>
    )
}
