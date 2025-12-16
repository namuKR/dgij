"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Score, WeeklyScheduleItem } from '@/lib/mockData';

interface StudentData {
    id: string;
    name: string;
    appliedTests: string[];
    scores: Score[];
    personalSchedule?: WeeklyScheduleItem[];
    lastWeekStart?: string; // ISO Date YYYY-MM-DD of Monday
}

interface StudentContextType {
    studentData: StudentData | null;
    isLoading: boolean;
    refreshStudentData: () => Promise<void>;
    applyToTest: (testId: string) => Promise<boolean>;
    addToSchedule: (day: string, testName: string) => Promise<boolean>;
    removeFromSchedule: (day: string, testName: string) => Promise<boolean>;
    addScore: (testId: string, subject: string, score: number, answers: Record<number, number>, selection?: string) => Promise<boolean>;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

// Helper to get Sunday of the current week (Start of week)
const getWeekStart = (d: Date) => {
    d = new Date(d);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = d.getDate() - day; // If Sun(0), date-0=Today. If Mon(1), date-1=PrevSun.
    return new Date(d.setDate(diff));
}

export function StudentProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [studentData, setStudentData] = useState<StudentData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchStudentData = async (userId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/student?userId=${userId}`, { cache: 'no-store' });
            if (res.ok) {
                const data: StudentData = await res.json();
                // Ensure name is synced with Auth user if missing
                if (!data.name && user?.name) {
                    data.name = user.name;
                }

                // --- Auto Reset Logic ---
                const today = new Date();
                const currentWeekStart = getWeekStart(today).toISOString().split('T')[0];

                let needsSave = false;

                if (!data.lastWeekStart) {
                    // Method: First run -> Initialize to current week (No reset)
                    data.lastWeekStart = currentWeekStart;
                    needsSave = true;
                } else if (data.lastWeekStart !== currentWeekStart) {
                    // Method: New week detected -> Reset Schedule
                    console.log(`New week detected: ${currentWeekStart} (was ${data.lastWeekStart}). Resetting schedule.`);
                    data.personalSchedule = []; // Clear schedule
                    data.lastWeekStart = currentWeekStart; // Update week tracker
                    needsSave = true;
                }

                setStudentData(data);

                if (needsSave) {
                    // Save updated metadata back to server immediately
                    await fetch('/api/student', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch student data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.id) {
            fetchStudentData(user.id);
        } else {
            setStudentData(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const refreshStudentData = async () => {
        if (user && user.id) {
            await fetchStudentData(user.id);
        }
    };

    const saveDataApi = async (newData: StudentData) => {
        try {
            const res = await fetch('/api/student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });
            if (!res.ok) throw new Error('Failed to save');
        } catch (error) {
            console.error(error);
        }
    };

    const updateStudentData = (updater: (prev: StudentData) => StudentData) => {
        setStudentData(prev => {
            if (!prev) return prev;
            const newData = updater(prev);
            // Trigger API save side-effect
            saveDataApi(newData);
            return newData;
        });
    };

    const applyToTest = async (testId: string) => {
        if (!user) return false;

        updateStudentData(prev => {
            if (prev.appliedTests?.includes(testId)) return prev;
            const updatedApplied = [...(prev.appliedTests || []), testId];
            return { ...prev, appliedTests: updatedApplied };
        });
        return true;
    };

    const addToSchedule = async (day: string, testName: string) => {
        if (!user) return false;

        updateStudentData(prev => {
            const schedule = prev.personalSchedule ? [...prev.personalSchedule] : [];
            const dayItemIndex = schedule.findIndex(item => item.day === day);
            if (dayItemIndex >= 0) {
                const dayItem = { ...schedule[dayItemIndex] };
                if (!dayItem.tests.includes(testName)) {
                    dayItem.tests = [...dayItem.tests, testName];
                    schedule[dayItemIndex] = dayItem;
                }
            } else {
                schedule.push({ day: day as any, tests: [testName] });
            }
            return { ...prev, personalSchedule: schedule };
        });
        return true;
    };

    const removeFromSchedule = async (day: string, testName: string) => {
        if (!user) return false;

        updateStudentData(prev => {
            if (!prev.personalSchedule) return prev;
            const schedule = prev.personalSchedule.map(item => {
                if (item.day === day) {
                    return { ...item, tests: item.tests.filter(t => t !== testName) };
                }
                return item;
            });
            return { ...prev, personalSchedule: schedule };
        });
        return true;
    };

    const addScore = async (testId: string, subject: string, score: number, answers: Record<number, number>, selection?: string) => {
        updateStudentData(prev => {
            const newScore: Score = {
                testId,
                subject: subject as any,
                score,
                date: new Date().toISOString().split('T')[0],
                answers,
                selection
            };

            // Remove existing score for this test if any (overwrite)
            const otherScores = prev.scores?.filter(s => s.testId !== testId) || [];

            // Mark as applied if not already
            const updatedApplied = prev.appliedTests?.includes(testId)
                ? prev.appliedTests
                : [...(prev.appliedTests || []), testId];

            return {
                ...prev,
                scores: [...otherScores, newScore],
                appliedTests: updatedApplied
            };
        });
        return true;
    };

    return (
        <StudentContext.Provider value={{ studentData, isLoading, refreshStudentData, applyToTest, addToSchedule, removeFromSchedule, addScore }}>
            {children}
        </StudentContext.Provider>
    );
}

export function useStudent() {
    const context = useContext(StudentContext);
    if (context === undefined) {
        throw new Error('useStudent must be used within a StudentProvider');
    }
    return context;
}
