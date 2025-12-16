import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { MockTest, Score, SELECTION_CONFIG } from '@/lib/mockData';
import { Check, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResultComparisonModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    test: MockTest | null;
    score: Score | undefined; // User's score object for this test
}

export function ResultComparisonModal({ open, onOpenChange, test, score }: ResultComparisonModalProps) {
    if (!test) return null;

    const userAnswers = score?.answers || {};

    const getSubjectKey = (subject?: string) => {
        if (subject === 'Korean') return '국어';
        if (subject === 'Math') return '수학';
        return subject;
    };

    const subjectKey = getSubjectKey(test.subject);
    const config = subjectKey ? SELECTION_CONFIG[subjectKey] : null;

    const renderGrid = (questions: number[], offset: number = 0, showUserAnswers: boolean = true) => (
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {questions.map((baseQNum) => {
                const qNum = baseQNum + offset;
                const correct = test.answerKey[qNum];

                // For user answers, we always look up by the base number (e.g. 23) if it's the correct section
                // effectively, the score.answers usually stores 1..30.
                // However, based on the implementation plan and data inspection:
                // Common: 1..22.
                // Selection: 23..30.
                // User answers would be stored as 1..30.
                // The answerKey has 1..22, 23..30 (Option 1), 123..130 (Option 2), 223..230 (Option 3).
                // If showUserAnswers is true, we map `qNum` (e.g. 23) to `userAnswers[23]`.
                // If using offset (e.g. 123), we still want to show user answer for 23 IF this is the user' selected subject.
                // But `showUserAnswers` is passed as true ONLY if it matches user selection.
                // Note: User answers are indexed 1..N. The offset answerKey is for display.
                // So if we are in offset mode (offset > 0), we shouldn't look for userAnswers[123], but userAnswers[23].
                // BUT, `questions` passed here are [23, 24..].

                const userAns = showUserAnswers ? userAnswers[baseQNum] : undefined;

                // Only render if we have a correct answer for this slot
                if (correct === undefined) return null;

                const hasSubmitted = userAns !== undefined;
                const isCorrect = userAns === correct;

                return (
                    <div
                        key={qNum}
                        className={`
                            flex flex-col items-center justify-center p-2 rounded border text-sm
                            ${hasSubmitted
                                ? (isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")
                                : "bg-slate-50 border-slate-200"
                            }
                        `}
                    >
                        <span className="text-muted-foreground text-xs mb-1">{baseQNum}번</span>
                        <div className="font-bold flex items-center gap-1">
                            <span className={hasSubmitted && !isCorrect ? "text-red-500 line-through opacity-70 scale-75" : "text-primary/0 hidden"}>
                                {userAns}
                            </span>
                            <span className={hasSubmitted ? (isCorrect ? "text-green-600" : "text-red-600") : ""}>
                                {correct}
                            </span>
                        </div>
                        {hasSubmitted && (
                            <div className="mt-1">
                                {isCorrect ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-red-500" />}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{test.fullName} - 정답표</DialogTitle>
                    <DialogDescription>
                        {score ? "내 답안과 정답을 비교합니다." : "정답을 확인합니다."}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 mt-4 p-1 pr-4">
                    {config ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-sm mb-3 px-1 flex items-center">
                                    <span className="bg-primary/10 text-primary px-2 py-1 rounded mr-2">공통</span>
                                    공통 과목
                                </h3>
                                {renderGrid(config.common, 0, true)}
                            </div>

                            {/* Render all selection options */}
                            {config.options.map((option, index) => {
                                // Offset logic: 0 for first option (if standard), but usually mapped as:
                                // If 3 options: Opt1 (0 offset from base range?), Opt2 (+100), Opt3 (+200)?
                                // Wait, the plan said "Iterate... offset = i * 100". 
                                // Let's check the data trace from planning:
                                // "122: 1" suggests offset logic. 
                                // If Math has 3 options: Prob(23-30), Calc(23-30), Geo(23-30).
                                // One of them is the "default" usually? Or are they all distinct?
                                // In `mockData`, key `122` exists. 22 + 100 = 122.
                                // So likely:
                                // Index 0 (Prob): Offset 0? (Keys 23-30)
                                // Index 1 (Calc): Offset 100? (Keys 123-130)
                                // Index 2 (Geo): Offset 200? (Keys 223-230)
                                // This assumes the `answerKey` contains keys 23..30, 123..130, etc.
                                // Let's try this heuristic.

                                const offset = index * 100;
                                // Determine if this specific option matches the user's selection
                                const isUserSelection = score?.selection === option;

                                // Check if data exists for this option to avoid empty sections
                                // We check if the first question of this block exists in answerKey
                                const firstQ = config.select[0] + offset;
                                if (test.answerKey[firstQ] === undefined) return null;

                                return (
                                    <div key={option}>
                                        <h3 className={`font-bold text-sm mb-3 px-1 flex items-center ${isUserSelection ? "text-primary" : "text-muted-foreground"}`}>
                                            <span className={`px-2 py-1 rounded mr-2 ${isUserSelection ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-500"}`}>
                                                선택 {index + 1}
                                            </span>
                                            {option} {isUserSelection && "(내 선택)"}
                                        </h3>
                                        {renderGrid(config.select, offset, isUserSelection)}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        renderGrid(Object.keys(test.answerKey).map(Number).sort((a, b) => a - b))
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

