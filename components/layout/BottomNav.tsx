'use client';

import React from 'react';
import { Home, PenTool, BarChart2, User, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();

    // Hide on login page
    if (pathname?.startsWith('/login') || pathname?.startsWith('/admin')) return null;

    const navItems = [
        { href: '/', label: '홈', icon: Home },
        { href: '/grade-input', label: '성적입력', icon: PenTool },
        { href: '/contents', label: '컨텐츠', icon: BookOpen }, // Added Contents for easy access
        // { href: '/analytics', label: '성적분석', icon: BarChart2 },
        { href: '/profile', label: '내 정보', icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-safe-area md:hidden">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
                            )}
                        >
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
