
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { WeeklyScheduleItem } from '@/lib/mockData';

interface GlobalScheduleContextType {
    globalSchedule: WeeklyScheduleItem[];
    isLoading: boolean;
    addToGlobalSchedule: (day: string, testName: string) => Promise<boolean>;
    // In future: removeFromGlobalSchedule
}

const GlobalScheduleContext = createContext<GlobalScheduleContextType | undefined>(undefined);

const DEFAULT_SCHEDULE: WeeklyScheduleItem[] = [
    { day: '월', tests: [] },
    { day: '화', tests: [] },
    { day: '수', tests: [] },
    { day: '목', tests: [] },
    { day: '금', tests: [] },
    { day: '토', tests: [] },
    { day: '일', tests: [] },
];

// Helper to get Sunday
const getWeekStart = (d: Date) => {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday based
    return new Date(d.setDate(diff));
}

export function GlobalScheduleProvider({ children }: { children: React.ReactNode }) {
    const [globalSchedule, setGlobalSchedule] = useState<WeeklyScheduleItem[]>(DEFAULT_SCHEDULE);
    const [lastWeekStart, setLastWeekStart] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSchedule = async () => {
        try {
            const res = await fetch('/api/schedule', { cache: 'no-store' });
            if (res.ok) {
                let data = await res.json();

                // --- Schema Migration & Auto Reset ---
                let scheduleData: WeeklyScheduleItem[] = [];
                let weekStart: string | undefined = undefined;

                if (Array.isArray(data)) {
                    // Legacy Format: just the array
                    scheduleData = data;
                } else if (data.schedule) {
                    // New Format: object
                    scheduleData = data.schedule;
                    weekStart = data.lastWeekStart;
                } else {
                    // Fallback
                    scheduleData = DEFAULT_SCHEDULE;
                }

                // Check Date
                const today = new Date();
                const currentWeekStart = getWeekStart(today).toISOString().split('T')[0];
                let needsSave = false;

                if (!weekStart) {
                    // First run/Legacy -> Init date, preserve schedule (or should we reset if legacy is "old"? defaulting to preserve to be safe)
                    // Actually, if it's legacy, it's effectively "unknown" date. Let's assume current week to avoid immediate wipe, or wipe?
                    // User expectation: "Reset when new week".
                    // Strategy: Init to current week. 
                    weekStart = currentWeekStart;
                    needsSave = true;
                } else if (weekStart !== currentWeekStart) {
                    // New Week -> Reset
                    console.log(`Global Schedule: New week detected (${currentWeekStart}). Resetting.`);
                    scheduleData = DEFAULT_SCHEDULE;
                    weekStart = currentWeekStart;
                    needsSave = true;
                }

                setGlobalSchedule(scheduleData);
                setLastWeekStart(weekStart);

                if (needsSave) {
                    await saveScheduleApi(scheduleData, weekStart);
                }
            }
        } catch (error) {
            console.error("Failed to fetch global schedule", error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveScheduleApi = async (schedule: WeeklyScheduleItem[], weekStart?: string) => {
        try {
            const payload = {
                schedule,
                lastWeekStart: weekStart // Persist the date
            };
            await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("Failed to save global schedule", e);
        }
    }

    useEffect(() => {
        fetchSchedule();
    }, []);

    const addToGlobalSchedule = async (day: string, testName: string) => {
        const prevSchedule = [...globalSchedule];
        let newSchedule = globalSchedule.map(item => ({ ...item, tests: [...item.tests] }));

        const dayIndex = newSchedule.findIndex(item => item.day === day);
        if (dayIndex >= 0) {
            if (!newSchedule[dayIndex].tests.includes(testName)) {
                newSchedule[dayIndex].tests.push(testName);
            }
        } else {
            // @ts-expect-error: Legacy format support
            newSchedule.push({ day, tests: [testName] });
        }

        setGlobalSchedule(newSchedule);

        try {
            await saveScheduleApi(newSchedule, lastWeekStart);
            return true;
        } catch (error) {
            console.error(error);
            setGlobalSchedule(prevSchedule);
            return false;
        }
    };

    return (
        <GlobalScheduleContext.Provider value={{ globalSchedule, isLoading, addToGlobalSchedule }}>
            {children}
        </GlobalScheduleContext.Provider>
    );
}

export function useGlobalSchedule() {
    const context = useContext(GlobalScheduleContext);
    if (context === undefined) {
        throw new Error('useGlobalSchedule must be used within a GlobalScheduleProvider');
    }
    return context;
}
