"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MockTest, MOCK_TESTS } from '@/lib/mockData';

interface MockTestContextType {
    mockTests: MockTest[];
    addMockTest: (test: MockTest) => void;
    deleteMockTest: (testId: string) => Promise<void>;
}

const MockTestContext = createContext<MockTestContextType | undefined>(undefined);

export function MockTestProvider({ children }: { children: React.ReactNode }) {
    const [mockTests, setMockTests] = useState<MockTest[]>([]);
    // Load from Cloudflare R2 on mount
    useEffect(() => {
        const fetchTests = async () => {
            try {
                const res = await fetch('/api/tests');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setMockTests(data);
                    } else {
                        setMockTests(MOCK_TESTS);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch mock tests:", error);
                setMockTests(MOCK_TESTS); // Fallback to local mock data
            }
        };

        fetchTests();
    }, []);

    const addMockTest = async (test: MockTest) => {
        // Optimistic UI Update
        setMockTests((prev) => [test, ...prev]);

        // Background Upload to R2
        try {
            await fetch('/api/tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(test),
            });
        } catch (error) {
            console.error("Failed to save test to cloud:", error);
            // Ideally rollback state here if failed, but keep simple for now
            alert("Warning: Failed to save to cloud. Data may be lost on refresh.");
        }
    };

    const deleteMockTest = async (testId: string) => {
        const prevTests = [...mockTests];
        // Optimistic UI Update
        setMockTests((prev) => prev.filter(t => t.id !== testId));

        try {
            const res = await fetch(`/api/tests?id=${testId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error("Failed to delete");
        } catch (error) {
            console.error("Failed to delete test:", error);
            setMockTests(prevTests); // Rollback
            alert("Failed to delete test from cloud.");
        }
    };

    return (
        <MockTestContext.Provider value={{ mockTests, addMockTest, deleteMockTest }}>
            {children}
        </MockTestContext.Provider>
    );
}

export function useMockTest() {
    const context = useContext(MockTestContext);
    if (context === undefined) {
        throw new Error('useMockTest must be used within a MockTestProvider');
    }
    return context;
}
