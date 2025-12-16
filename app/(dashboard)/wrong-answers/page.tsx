"use client";

import { useMemo, useState } from 'react';
import { useStudent } from '@/lib/context/StudentContext';
import { useMockTest } from "@/lib/context/MockTestContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronDown, Info, FileText, HelpCircle } from "lucide-react";
import { MockTest, SELECTION_CONFIG } from '@/lib/mockData';
import { TestDetailModal } from "@/components/dashboard/TestDetailModal";
import { GradeInputModal } from "@/components/dashboard/GradeInputModal";
import { ResultComparisonModal } from "@/components/dashboard/ResultComparisonModal";
import { PDFViewerModal } from "@/components/dashboard/PDFViewerModal";
import { QuestionAskModal } from "@/components/dashboard/QuestionAskModal";

interface WrongAnswer {
    testId: string;
    testName: string;
    subject: string;
    questionNumber: number;
    userAnswer: number | undefined;
    correctAnswer: number;
    date: string;
    selection?: string;
    examFileUrl?: string; // Added to helper interface
}

interface ExamGroup {
    test: MockTest;
    wrongAnswers: WrongAnswer[];
    date: string;
}

export default function WrongAnswersPage() {
    const { studentData } = useStudent();
    const { mockTests } = useMockTest();
    const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>({});

    // Modal states
    const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
    const [inspectingTest, setInspectingTest] = useState<MockTest | null>(null);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

    // PDF Viewer State
    const [pdfViewer, setPdfViewer] = useState<{ open: boolean; url: string | null; page: number; title: string }>({
        open: false,
        url: null,
        page: 1,
        title: ''
    });

    // Ask Question State
    const [askModal, setAskModal] = useState<{
        open: boolean;
        item: WrongAnswer | null;
        page: number;
    }>({
        open: false,
        item: null,
        page: 1
    });

    const toggleExam = (testId: string) => {
        setExpandedExams(prev => ({ ...prev, [testId]: !prev[testId] }));
    };

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
        setInspectingTest(test);
    };

    // Page Mapping Logic
    const getExamPageNumber = (subject: string, questionNumber: number, selection?: string): number | null => {
        if (subject === '수학' || subject === 'Math') {
            // Common
            if (questionNumber >= 1 && questionNumber <= 4) return 1;
            if (questionNumber >= 5 && questionNumber <= 7) return 2;
            if (questionNumber >= 8 && questionNumber <= 10) return 3;
            if (questionNumber >= 11 && questionNumber <= 12) return 4;
            if (questionNumber >= 13 && questionNumber <= 14) return 5;
            if (questionNumber >= 15 && questionNumber <= 17) return 6;
            if (questionNumber >= 18 && questionNumber <= 20) return 7;
            if (questionNumber >= 21 && questionNumber <= 22) return 8;

            // Selection
            if (selection === '확률과 통계') {
                if (questionNumber >= 23 && questionNumber <= 24) return 9;
                if (questionNumber >= 25 && questionNumber <= 26) return 10;
                if (questionNumber >= 27 && questionNumber <= 28) return 11;
                if (questionNumber >= 29 && questionNumber <= 30) return 12;
            }
            if (selection === '미적분') {
                if (questionNumber >= 23 && questionNumber <= 24) return 13;
                if (questionNumber >= 25 && questionNumber <= 26) return 14;
                if (questionNumber >= 27 && questionNumber <= 28) return 15;
                if (questionNumber >= 29 && questionNumber <= 30) return 16;
            }
        }

        if (subject === '영어' || subject === 'English') {
            if (questionNumber >= 1 && questionNumber <= 12) return 1;
            if (questionNumber >= 13 && questionNumber <= 20) return 2;
            if (questionNumber >= 21 && questionNumber <= 24) return 3;
            if (questionNumber >= 25 && questionNumber <= 28) return 4;
            if (questionNumber >= 29 && questionNumber <= 32) return 5;
            if (questionNumber >= 33 && questionNumber <= 36) return 6;
            if (questionNumber >= 37 && questionNumber <= 40) return 7;
            if (questionNumber >= 41 && questionNumber <= 45) return 8;
        }

        return null;
    };

    const openQuestionPdf = (item: WrongAnswer) => {
        if (!item.examFileUrl) return;

        const page = getExamPageNumber(item.subject, item.questionNumber, item.selection);
        if (page) {
            setPdfViewer({
                open: true,
                url: item.examFileUrl,
                page: page,
                title: `${item.testName} #${item.questionNumber}`
            });
        } else {
            // Fallback: just separate tab download or handle error?
            // User requested popup that returns 'specific page'. If mapping fails, maybe just open page 1?
            handleDownload(item.examFileUrl);
        }
    };

    const handleAskQuestion = (item: WrongAnswer) => {
        if (!item.examFileUrl) return;
        const page = getExamPageNumber(item.subject, item.questionNumber, item.selection);

        if (page) {
            setAskModal({
                open: true,
                item: item,
                page: page
            });
        }
    };


    const groupedAnswers = useMemo(() => {
        if (!studentData?.scores || !mockTests) return [];

        const groups: Record<string, ExamGroup> = {};

        studentData.scores.forEach(score => {
            const test = mockTests.find(t => t.id === score.testId);
            if (!test) return;

            const userAnswers = score.answers || {};
            const incorrect: WrongAnswer[] = [];

            // Get Subject Config
            const getSubjectKey = (sub: string) => {
                if (sub === 'Korean') return '국어';
                if (sub === 'Math') return '수학';
                return sub;
            };
            const subjectKey = getSubjectKey(test.subject);
            const config = subjectKey ? SELECTION_CONFIG[subjectKey] : null;

            // Relevant Question Indices
            let relevantQuestions: number[] = [];

            if (config) {
                // Common
                relevantQuestions = [...config.common];
                // Selection
                if (score.selection) {
                    const selectionIndex = config.options.indexOf(score.selection);
                    if (selectionIndex !== -1) {
                        const offset = selectionIndex * 100;
                        const selectionQuestions = config.select.map(q => q + offset);
                        relevantQuestions = [...relevantQuestions, ...selectionQuestions];
                    }
                }
            } else {
                relevantQuestions = Object.keys(test.answerKey).map(Number);
            }

            relevantQuestions.forEach(qNum => {
                const correct = test.answerKey[qNum];
                if (correct === undefined) return;

                let baseQNum = qNum;
                if (qNum > 100) baseQNum = qNum % 100;

                const userAns = userAnswers[baseQNum];

                if (userAns !== correct) {
                    incorrect.push({
                        testId: test.id,
                        testName: test.fullName,
                        subject: subjectKey, // Use normalized subject (e.g. 'Math' -> '수학')
                        questionNumber: baseQNum, // Display as 23, not 123
                        userAnswer: userAns,
                        correctAnswer: correct,
                        date: score.date,
                        selection: score.selection,
                        examFileUrl: test.examFileUrl
                    });
                }
            });

            if (incorrect.length > 0) {
                if (!groups[test.id]) {
                    groups[test.id] = {
                        test: test,
                        wrongAnswers: [],
                        date: score.date
                    };
                }
                groups[test.id].wrongAnswers.push(...incorrect);
            }
        });

        // Convert to array and sort by date desc
        return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [studentData, mockTests]);

    // Helper to get score for passing to modal
    const getTestScore = (testId: string) => {
        return studentData?.scores?.find(s => s.testId === testId)?.score;
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-orange-500" />
                    오답노트
                </h1>
                <p className="text-muted-foreground mt-2">
                    틀린 문제를 시험별로 모아서 복습하세요.
                </p>
            </header>

            {groupedAnswers.length === 0 ? (
                <div className="text-center py-20 bg-white/50 rounded-xl border-2 border-dashed border-slate-200">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-3xl">👏</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">틀린 문제가 없습니다!</h3>
                        <p className="text-slate-500">완벽합니다. 계속해서 학습을 이어가세요.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {groupedAnswers.map((group) => {
                        const isExpanded = expandedExams[group.test.id];
                        return (
                            <div key={group.test.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">
                                <button
                                    onClick={() => toggleExam(group.test.id)}
                                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left group"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                        <Badge variant="outline" className="w-fit mb-1 md:mb-0">
                                            {group.date}
                                        </Badge>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">{group.test.fullName}</h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                <span className="text-red-500 font-bold">{group.wrongAnswers.length}</span>개의 오답이 있습니다.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTest(group.test);
                                            }}
                                        >
                                            <Info className="w-5 h-5" />
                                            <span className="sr-only">정보 보기</span>
                                        </Button>
                                        <div className={`p-2 rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <ChevronDown className="w-5 h-5" />
                                        </div>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="p-5 border-t bg-slate-50/50 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {group.wrongAnswers.map((item, idx) => (
                                                <Card key={`${item.testId}-${item.questionNumber}-${idx}`} className="border-l-4 border-l-red-400 shadow-sm">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex gap-1">
                                                                <Badge variant="secondary" className="px-2 py-0.5 h-auto text-[10px] text-slate-500">
                                                                    {(() => {
                                                                        const isMath = item.subject === 'Math' || item.subject === '수학';
                                                                        const isKorean = item.subject === 'Korean' || item.subject === '국어';

                                                                        if (isMath) {
                                                                            if (item.questionNumber <= 22) return '공통';
                                                                            return item.selection || '선택';
                                                                        }
                                                                        if (isKorean) {
                                                                            if (item.questionNumber <= 34) return '공통';
                                                                            return item.selection || '선택';
                                                                        }
                                                                        return item.selection || '공통';
                                                                    })()}
                                                                </Badge>
                                                                {item.examFileUrl && getExamPageNumber(item.subject, item.questionNumber, item.selection) && (
                                                                    <>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-5 px-2 text-[10px] text-blue-600 gap-1 hover:text-blue-700 hover:bg-blue-50"
                                                                            onClick={() => openQuestionPdf(item)}
                                                                        >
                                                                            <FileText className="w-3 h-3" />
                                                                            문제 보기
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-5 px-2 text-[10px] text-green-600 gap-1 hover:text-green-700 hover:bg-green-50"
                                                                            onClick={() => handleAskQuestion(item)}
                                                                        >
                                                                            <HelpCircle className="w-3 h-3" />
                                                                            질문하기
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">No.</span>
                                                                <span className="text-xl font-black text-slate-700">{item.questionNumber}</span>
                                                            </div>
                                                            <div className="h-8 w-px bg-slate-100"></div>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">MY</span>
                                                                <span className="text-xl font-black text-red-500 line-through decoration-2 decoration-200">
                                                                    {item.userAnswer ?? "-"}
                                                                </span>
                                                            </div>
                                                            <div className="h-8 w-px bg-slate-100"></div>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">ANS</span>
                                                                <span className="text-xl font-black text-green-600">
                                                                    {item.correctAnswer}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modals */}
            <TestDetailModal
                test={selectedTest}
                open={!!selectedTest}
                onOpenChange={(open) => !open && setSelectedTest(null)}
                score={selectedTest ? getTestScore(selectedTest.id) ?? undefined : undefined}
                onGradeClick={() => setIsGradeModalOpen(true)}
                onAnswerKeyClick={handleAnswerKeyClick}
                onDownload={handleDownload}
            />

            <GradeInputModal
                open={isGradeModalOpen}
                onOpenChange={setIsGradeModalOpen}
                test={selectedTest}
                initialData={selectedTest ? studentData?.scores?.find(s => s.testId === selectedTest.id) : undefined}
            />

            <ResultComparisonModal
                open={!!inspectingTest}
                onOpenChange={(open) => !open && setInspectingTest(null)}
                test={inspectingTest}
                score={inspectingTest ? studentData?.scores?.find(s => s.testId === inspectingTest.id) : undefined}
            />

            <PDFViewerModal
                open={pdfViewer.open}
                onOpenChange={(open) => setPdfViewer(prev => ({ ...prev, open }))}
                url={pdfViewer.url}
                page={pdfViewer.page}
                title={pdfViewer.title}
            />

            {askModal.item && (
                <QuestionAskModal
                    open={askModal.open}
                    onClose={() => setAskModal(prev => ({ ...prev, open: false }))}
                    pdfUrl={askModal.item.examFileUrl ?? null}
                    pageNumber={askModal.page}
                    testName={askModal.item.testName}
                    subjectKey={askModal.item.subject}
                    selectionName={askModal.item.selection}
                    questionNumber={askModal.item.questionNumber}
                    userAnswer={askModal.item.userAnswer}
                    correctAnswer={askModal.item.correctAnswer}
                />
            )}
        </div>
    );
}
