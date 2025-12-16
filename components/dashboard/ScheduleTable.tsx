'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, Plus, Globe } from 'lucide-react';
import { useStudent } from '@/lib/context/StudentContext';
import { useMockTest } from '@/lib/context/MockTestContext';
import { useGlobalSchedule } from '@/lib/context/GlobalScheduleContext';
import { GradeInputModal } from './GradeInputModal';
import { ScheduleContentSelector } from './ScheduleContentSelector';
import { TestDetailModal } from './TestDetailModal';
import { ResultComparisonModal } from './ResultComparisonModal';
import { MockTest } from '@/lib/mockData';

export function ScheduleTable() {
    const { studentData, addToSchedule, removeFromSchedule, applyToTest } = useStudent();
    const { mockTests } = useMockTest();
    const { globalSchedule, addToGlobalSchedule } = useGlobalSchedule();

    // UI State
    const [selectedTest, setSelectedTest] = React.useState<string | null>(null);
    const [isGradeModalOpen, setIsGradeModalOpen] = React.useState(false);
    const [deleteAction, setDeleteAction] = React.useState<(() => void) | undefined>(undefined);

    // Detail Modal State
    const [viewingDetailTest, setViewingDetailTest] = React.useState<MockTest | null>(null);
    const [viewingTestForKey, setViewingTestForKey] = React.useState<MockTest | null>(null);
    const [showFormatDialog, setShowFormatDialog] = React.useState(false);

    // Add Item State
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
    const [newItemName, setNewItemName] = React.useState('');
    const [inputMode, setInputMode] = React.useState<'select' | 'text'>('select');
    const [selectedTestId, setSelectedTestId] = React.useState<string>('');
    const [isGlobalAdd, setIsGlobalAdd] = React.useState(false);

    const days = ['월', '화', '수', '목', '금', '토', '일'];

    const handleDownload = (url: string) => {
        if (!url) return;
        const link = document.createElement('a');
        link.href = "https://pub-c45c0bdedae9472188e6d86b016bf763.r2.dev/" + url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = url.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAnswerKeyClick = (test: MockTest) => {
        const hasKey = test.answerKey && Object.keys(test.answerKey).length > 0;
        const hasImg = !!test.answerKeyImgUrl;

        if (hasKey && hasImg) {
            setViewingTestForKey(test);
            setShowFormatDialog(true);
        } else if (hasKey) {
            setViewingTestForKey(test);
            setShowFormatDialog(false);
        } else if (hasImg) {
            handleDownload(test.answerKeyImgUrl!);
        }
    };

    const handleTestClick = (testName: string, isPersonal: boolean, day: string) => {
        // Setup Delete Action regardless of view mode
        if (isPersonal) {
            setDeleteAction(() => async () => {
                await removeFromSchedule(day, testName);
            });
        } else {
            setDeleteAction(undefined);
        }

        // Try to find the detailed MockTest object
        const systemTest = mockTests.find(t => t.fullName === testName);
        if (systemTest) {
            // Found a system test -> Open Detail Modal
            setViewingDetailTest(systemTest);
        } else {
            // Not a system test -> Open Grade Input directly (Legacy behavior)
            setSelectedTest(testName);
            setIsGradeModalOpen(true);
        }
    };

    const openAddModal = (day: string) => {
        setSelectedDay(day);
        setNewItemName('');
        setSelectedTestId('');
        setInputMode('select');
        setIsGlobalAdd(false);
        setIsAddModalOpen(true);
    };

    const handleAddItem = async () => {
        if (!selectedDay) return;

        let nameToAdd = newItemName;
        let testIdToApply = null;

        if (inputMode === 'select') {
            if (!selectedTestId) return;
            const test = mockTests.find(t => t.id === selectedTestId);
            if (test) {
                nameToAdd = test.fullName;
                testIdToApply = test.id;
            }
        }

        if (!nameToAdd.trim()) return;

        if (isGlobalAdd) {
            await addToGlobalSchedule(selectedDay, nameToAdd.trim());
        } else {
            if (testIdToApply) {
                await applyToTest(testIdToApply);
            }
            await addToSchedule(selectedDay, nameToAdd.trim());
        }

        setIsAddModalOpen(false);
    };

    return (
        <>
            <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                        <CalendarDays className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg text-primary">이번 주 스케줄</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="grid grid-cols-7 text-center divide-x bg-muted/40 text-xs font-semibold py-2">
                            {days.map(day => (
                                <div key={day} className="flex items-center justify-center gap-1 group relative">
                                    {day}
                                    <button
                                        onClick={() => openAddModal(day)}
                                        className="absolute right-1 text-muted-foreground/40 hover:text-primary transition-colors"
                                        title="일정 추가"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 divide-x text-sm min-h-[120px]">
                            {days.map((day) => {
                                const globalTests = globalSchedule.find(item => item.day === day)?.tests || [];
                                const personalTests = studentData?.personalSchedule?.find(item => item.day === day)?.tests || [];

                                return (
                                    <div key={day} className="p-2 flex flex-col space-y-2 items-center group/day">
                                        {/* Global Items */}
                                        {globalTests.map((test, i) => (
                                            <div key={`global-${i}`} className="w-full">
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] w-full break-keep px-1 py-0.5 justify-center h-auto text-center leading-tight hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer select-none"
                                                    onClick={() => handleTestClick(test, false, day)}
                                                >
                                                    {test.replace('2027 ', '').replace('Sijae ', '')}
                                                </Badge>
                                            </div>
                                        ))}

                                        {/* Personal Items */}
                                        {personalTests.map((test, i) => (
                                            <div key={`personal-${i}`} className="w-full relative group/item">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] w-full break-keep px-1 py-0.5 justify-center h-auto text-center leading-tight border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 cursor-pointer select-none"
                                                    onClick={() => handleTestClick(test, true, day)}
                                                >
                                                    {test}
                                                </Badge>
                                            </div>
                                        ))}

                                        {/* Placeholder if empty */}
                                        {globalTests.length === 0 && personalTests.length === 0 && (
                                            <button
                                                onClick={() => openAddModal(day)}
                                                className="w-full h-full min-h-[40px] flex items-center justify-center text-muted-foreground/10 hover:text-muted-foreground/30 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <TestDetailModal
                test={viewingDetailTest}
                open={!!viewingDetailTest}
                onOpenChange={(open) => !open && setViewingDetailTest(null)}
                score={viewingDetailTest ? studentData?.scores?.find(s => s.testId === viewingDetailTest.id)?.score : undefined}
                onGradeClick={() => {
                    if (viewingDetailTest) {
                        setSelectedTest(viewingDetailTest.fullName);
                        setIsGradeModalOpen(true);
                        setViewingDetailTest(null);
                    }
                }}
                onAnswerKeyClick={handleAnswerKeyClick}
                onDownload={handleDownload}
            />

            <Dialog open={showFormatDialog} onOpenChange={setShowFormatDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>정답표 보기</DialogTitle>
                        <DialogDescription>
                            원하시는 형식을 선택해주세요.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-4">
                        <Button className="h-12 text-base" onClick={() => setShowFormatDialog(false)}>
                            <div className="flex items-center">
                                <span className="font-bold mr-2">빠른 채점</span>
                                <span className="text-primary-foreground/70 text-xs font-normal">(온라인 표)</span>
                            </div>
                        </Button>
                        <Button variant="outline" className="h-12 text-base" onClick={() => {
                            setShowFormatDialog(false);
                            setViewingTestForKey(null);
                            if (viewingTestForKey?.answerKeyImgUrl) {
                                handleDownload(viewingTestForKey.answerKeyImgUrl);
                            }
                        }}>
                            <div className="flex items-center">
                                <span className="font-bold mr-2">이미지 파일</span>
                                <span className="text-muted-foreground text-xs font-normal">(원본 스캔)</span>
                            </div>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ResultComparisonModal
                open={!!viewingTestForKey && !showFormatDialog}
                onOpenChange={(open) => !open && setViewingTestForKey(null)}
                test={viewingTestForKey}
                score={viewingTestForKey ? studentData?.scores?.find(s => s.testId === viewingTestForKey.id) : undefined}
            />

            <GradeInputModal
                testName={selectedTest}
                open={isGradeModalOpen}
                onOpenChange={setIsGradeModalOpen}
                onDelete={deleteAction}
            />

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>스케줄 추가 ({selectedDay}요일)</DialogTitle>
                        <DialogDescription>
                            추가할 학습 자료를 선택하거나 직접 입력하세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-4">
                        <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                            <Button
                                variant={inputMode === 'select' ? 'outline' : 'ghost'}
                                size="sm"
                                className={`text-xs h-8 ${inputMode === 'select' ? 'bg-white shadow-sm' : ''}`}
                                onClick={() => setInputMode('select')}
                            >
                                학습 자료 선택
                            </Button>
                            <Button
                                variant={inputMode === 'text' ? 'outline' : 'ghost'}
                                size="sm"
                                className={`text-xs h-8 ${inputMode === 'text' ? 'bg-white shadow-sm' : ''}`}
                                onClick={() => setInputMode('text')}
                            >
                                직접 입력
                            </Button>
                        </div>

                        {inputMode === 'select' ? (
                            <ScheduleContentSelector
                                mockTests={mockTests}
                                selectedTestId={selectedTestId}
                                onSelect={setSelectedTestId}
                            />
                        ) : (
                            <div className="py-8">
                                <Input
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder="예: 2027 서바이벌 국어 3회"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="flex items-center space-x-2 pt-2 border-t">
                            <input
                                type="checkbox"
                                id="global-add"
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={isGlobalAdd}
                                onChange={(e) => setIsGlobalAdd(e.target.checked)}
                            />
                            <Label htmlFor="global-add" className="flex items-center text-sm cursor-pointer select-none">
                                <Globe className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                공통 스케줄로 추가 (관리자)
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>취소</Button>
                        <Button onClick={handleAddItem} disabled={inputMode === 'select' && !selectedTestId || inputMode === 'text' && !newItemName.trim()}>
                            {isGlobalAdd ? '공통 스케줄 추가' : (inputMode === 'select' ? '선택 및 추가' : '추가')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
