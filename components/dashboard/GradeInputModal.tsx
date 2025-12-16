'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Camera, CheckCircle2, Upload, Trash2 } from 'lucide-react';
import { useStudent } from '@/lib/context/StudentContext';
import { MockTest, SELECTION_CONFIG } from '@/lib/mockData';
import { useMockTest } from '@/lib/context/MockTestContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface GradeInputModalProps {
    testName: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete?: () => void;
}

export function GradeInputModal({ testName, open, onOpenChange, onDelete }: GradeInputModalProps) {
    const { mockTests } = useMockTest();
    const { studentData, addScore } = useStudent();
    const [selectedTest, setSelectedTest] = useState<MockTest | undefined>(undefined);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [selection, setSelection] = useState<string | undefined>(undefined); // New selection state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [score, setScore] = useState<number | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("omr"); // Default to OMR
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Reset data loaded state when test or modal state changes
    useEffect(() => {
        setIsDataLoaded(false);
    }, [testName, open]);



    useEffect(() => {
        if (testName && open && !isDataLoaded) {
            const found = mockTests.find(t => t.fullName === testName);
            setSelectedTest(found);

            // Check for existing score
            if (found && studentData?.scores) {
                const existing = studentData.scores.find(s => s.testId === found.id);
                if (existing) {
                    setAnswers(existing.answers || {});
                    setScore(existing.score);
                    setSelection(existing.selection); // Load selection
                } else {
                    setAnswers({});
                    setScore(null);
                    setSelection(undefined);
                }
                setIsDataLoaded(true); // Mark as loaded
            } else if (found) {
                // If found but no student data yet (or empty scores), just clear validly
                setAnswers({});
                setScore(null);
                setSelection(undefined);
                setIsDataLoaded(true);
            }
        }
    }, [testName, open, mockTests, studentData, isDataLoaded]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleOMRScan = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        setUploadProgress(0);

        // Simulate progress
        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) return prev;
                return prev + 10;
            });
        }, 500);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/omr', {
                method: 'POST',
                body: formData,
            });

            clearInterval(interval);
            setUploadProgress(100);

            if (!res.ok) throw new Error('API Request failed');

            const data = await res.json();

            if (data.answers) {
                const newAnswers: Record<number, number> = {};
                Object.keys(data.answers).forEach(key => {
                    const k = Number(key);
                    const v = Number(data.answers[key]);
                    if (!isNaN(k)) {
                        newAnswers[k] = v;
                    }
                });
                setAnswers(newAnswers);

                // Success! Switch to manual tab after a short delay
                setTimeout(() => {
                    setIsAnalyzing(false);
                    setUploadProgress(0);
                    setActiveTab("manual");
                    // Auto-submit
                    calculateScore(newAnswers);
                    toast.success("성적이 자동으로 입력되었습니다.");
                }, 1000);
            }
        } catch (err) {
            console.error(err);
            clearInterval(interval);
            setIsAnalyzing(false);
            setUploadProgress(0);
            alert("OMR 분석에 실패했습니다. (API Key 확인 필요 등)");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getMathPoints = (qNum: number) => {
        if (qNum >= 1 && qNum <= 2) return 2;
        if (qNum >= 3 && qNum <= 8) return 3;
        if (qNum >= 9 && qNum <= 15) return 4;
        if (qNum >= 16 && qNum <= 19) return 3;
        if (qNum >= 20 && qNum <= 22) return 4;
        if (qNum === 23) return 2;
        if (qNum >= 24 && qNum <= 27) return 3;
        if (qNum >= 28 && qNum <= 30) return 4;
        return 0; // Default or error
    };

    const calculateScore = async (answersOverride?: Record<number, number>) => {
        if (!selectedTest) return;

        const currentAnswers = answersOverride || answers;

        // Validation: If selection required, ensure selected
        const config = SELECTION_CONFIG[selectedTest.subject];
        if (config && !selection) {
            alert("선택 과목을 선택해주세요.");
            return;
        }

        let calculatedScore = 0;
        // Robust check for subjects
        const isMath = selectedTest.subject === '수학' || (selectedTest.subject as string) === 'Math';
        const isKorean = selectedTest.subject === '국어' || (selectedTest.subject as string) === 'Korean';

        if (isMath) {
            // Math uses weighted scoring on 30 questions (1..30)
            for (let q = 1; q <= 30; q++) {
                let targetKey = q;

                // Handle Selection Subject Mapping (23-30)
                if (q >= 23 && selection) {
                    if (selection === '미적분') {
                        if (selectedTest.answerKey[q + 100] !== undefined) targetKey = q + 100;
                    } else if (selection === '기하') {
                        if (selectedTest.answerKey[q + 200] !== undefined) targetKey = q + 200;
                    }
                }

                if (currentAnswers[q] !== undefined && selectedTest.answerKey[targetKey] !== undefined) {
                    if (Number(currentAnswers[q]) === selectedTest.answerKey[targetKey]) {
                        calculatedScore += getMathPoints(q);
                    }
                }
            }
        } else if (isKorean) {
            // Korean uses Count scoring on 45 questions (1..45)
            for (let q = 1; q <= 45; q++) {
                let targetKey = q;

                // Handle Selection Subject Mapping (35-45)
                if (q >= 35 && selection) {
                    // Assumption: 'Language and Media' (언어와 매체) might use offset 100?
                    // 'Speech and Writing' (화법과 작문) is standard.
                    if (selection === '언어와 매체') {
                        if (selectedTest.answerKey[q + 100] !== undefined) targetKey = q + 100;
                    }
                }

                if (currentAnswers[q] !== undefined && selectedTest.answerKey[targetKey] !== undefined) {
                    if (Number(currentAnswers[q]) === selectedTest.answerKey[targetKey]) {
                        calculatedScore += 1;
                    }
                }
            }
        } else {
            // Other subjects: Generic Count
            Object.keys(selectedTest.answerKey).forEach(k => {
                const key = Number(k);
                if (currentAnswers[key] !== undefined) {
                    if (Number(currentAnswers[key]) === selectedTest.answerKey[key]) {
                        calculatedScore += 1;
                    }
                }
            });
        }

        setScore(calculatedScore);
        await addScore(selectedTest.id, selectedTest.subject, calculatedScore, currentAnswers, selection);
    };

    const handleDeleteConfirm = () => {
        if (onDelete) {
            onDelete();
            onOpenChange(false);
        }
        setIsDeleteAlertOpen(false);
    };

    const inputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map());

    const isSubjectiveQuestion = (subject: string | undefined, k: number) => {
        const isMath = subject === '수학' || subject === 'Math';
        if (!isMath) return false;
        // Math Subjective ranges: 16-22, 29-30
        return (k >= 16 && k <= 22) || (k >= 29 && k <= 30);
    };

    const handleInputChange = (k: number, val: string) => {
        // Validate input: numbers only
        if (val && !/^\d*$/.test(val)) return;

        setAnswers(prev => ({ ...prev, [k]: Number(val) }));

        // Auto-advance logic
        const subject = selectedTest?.subject;
        const subjective = isSubjectiveQuestion(subject, k);

        // If objective (not subjective) and length is 1, move to next
        if (!subjective && val.length === 1) {
            const nextRef = inputRefs.current.get(k + 1);
            nextRef?.focus();
        }
    };

    const renderInputGrid = (questions: number[]) => (
        <div className="grid grid-cols-5 gap-2">
            {questions.map((k) => {
                const subjective = isSubjectiveQuestion(selectedTest?.subject, k);
                return (
                    <div key={k} className="flex flex-col items-center space-y-1">
                        <Label className="text-xs text-muted-foreground">{k}</Label>
                        <Input
                            ref={(el) => {
                                if (el) inputRefs.current.set(k, el);
                                else inputRefs.current.delete(k);
                            }}
                            className={`h-8 w-12 text-center ${subjective ? 'border-blue-200 bg-blue-50/50' : ''}`} // Highlight subjective
                            maxLength={subjective ? 3 : 1}
                            value={answers[k] || ''}
                            onChange={(e) => handleInputChange(k, e.target.value)}
                            inputMode={subjective ? "numeric" : "numeric"}
                        />
                    </div>
                );
            })}
        </div>
    );

    const getSubjectKey = (subject?: string) => {
        if (subject === 'Korean') return '국어';
        if (subject === 'Math') return '수학';
        return subject;
    };

    const config = selectedTest ? SELECTION_CONFIG[getSubjectKey(selectedTest.subject) || ''] : null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="space-y-4">
                        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                            <h2 className="text-lg font-semibold leading-none tracking-tight">성적 입력</h2>
                            <p className="text-sm text-muted-foreground">
                                {testName || '시험을 선택해주세요'}
                            </p>
                        </div>

                        {!selectedTest ? (
                            <div className="py-4 space-y-4">
                                <div className="text-center text-muted-foreground">
                                    시험 정보를 찾을 수 없습니다. (스케줄 전용 항목일 수 있습니다)
                                </div>
                                {onDelete && (
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => setIsDeleteAlertOpen(true)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        스케줄에서 삭제
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {config && (
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <Label className="text-base font-semibold">선택 과목</Label>
                                        <Select value={selection} onValueChange={setSelection}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="선택 과목" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {config.options.map(opt => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="manual">수동 입력</TabsTrigger>
                                        <TabsTrigger value="omr">가채점표 스캔 (AI)</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="manual" className="space-y-4 pt-4">

                                        {config ? (
                                            <div className="space-y-6">
                                                <div>
                                                    <h3 className="font-semibold text-sm mb-3 text-muted-foreground">공통 과목</h3>
                                                    {renderInputGrid(config.common)}
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="font-semibold text-sm text-muted-foreground">선택 과목 점수</h3>
                                                    </div>

                                                    {selection ? (
                                                        renderInputGrid(config.select)
                                                    ) : (
                                                        <div className="p-4 border border-dashed rounded-lg text-center text-xs text-muted-foreground bg-muted/20">
                                                            상단에서 선택 과목을 선택해주세요.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            // Fallback for non-configured subjects (English, History, Sci) -> Show all keys from answerKey or just generic 1-20/45
                                            renderInputGrid(selectedTest.answerKey ? Object.keys(selectedTest.answerKey).map(Number) : [])
                                        )}

                                    </TabsContent>

                                    <TabsContent value="omr" className="space-y-4 pt-4">
                                        <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center space-y-4 bg-muted/20">
                                            {isAnalyzing ? (
                                                <div className="flex flex-col items-center w-full max-w-xs space-y-4">
                                                    <Camera className="w-12 h-12 text-primary animate-pulse" />
                                                    <p className="text-sm text-muted-foreground animate-pulse">Gemini가 가채점표를 분석중입니다...</p>
                                                    <Progress value={uploadProgress} className="w-full" />
                                                </div>
                                            ) : (
                                                <>
                                                    <Camera className="w-12 h-12 text-muted-foreground" />
                                                    <div className="flex gap-2">
                                                        <Button onClick={handleOMRScan} variant="outline">
                                                            <Upload className="w-4 h-4 mr-2" />
                                                            사진 업로드/촬영
                                                        </Button>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            ref={fileInputRef}
                                                            onChange={handleFileChange}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <Button className="w-full" size="lg" onClick={() => calculateScore()}>
                                    제출 및 채점하기
                                </Button>

                                {score !== null && (
                                    <Card className="bg-primary/5 border-primary animate-in fade-in zoom-in duration-300">
                                        <CardContent className="pt-6 flex flex-col items-center">
                                            <CheckCircle2 className="w-12 h-12 text-primary mb-2" />
                                            <h2 className="text-3xl font-bold text-primary">
                                                {(selectedTest?.subject === '수학' || (selectedTest?.subject as string) === 'Math')
                                                    ? `${score}점 / 100점`
                                                    : (selectedTest?.subject === '국어' || (selectedTest?.subject as string) === 'Korean')
                                                        ? `${score} / 45`
                                                        : `${score} / ${selectedTest?.answerKey ? Object.keys(selectedTest.answerKey).length : '-'}`
                                                }
                                            </h2>
                                            <p className="text-sm text-muted-foreground">
                                                성적이 저장되었습니다!
                                                {selection && <span className="block text-xs mt-1 opacity-70">({selection})</span>}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {onDelete && (
                                    <>
                                        <div className="h-px bg-border my-4" />
                                        <Button
                                            variant="ghost"
                                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => setIsDeleteAlertOpen(true)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            스케줄에서 삭제
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>

                <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>스케줄 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                                정말로 이 스케줄을 삭제하시겠습니까?
                                <br />
                                (입력된 성적 데이터는 유지됩니다)
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                                삭제
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Dialog>
        </>
    );
}
