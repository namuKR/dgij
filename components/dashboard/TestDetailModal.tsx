"use client";

import { MockTest } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Edit3, FileText, CheckCircle, HelpCircle, Headphones, ChevronRight, CalendarPlus, Trash2 } from "lucide-react";
import { useStudent } from "@/lib/context/StudentContext";
import { useAuth } from "@/lib/context/AuthContext";
import { useMockTest } from "@/lib/context/MockTestContext";
import { useState } from "react";
import { cn, getTestThumbnail } from "@/lib/utils";

interface TestDetailModalProps {
    test: MockTest | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    score: number | undefined;
    onGradeClick: () => void;
    onAnswerKeyClick: (test: MockTest) => void;
    onDownload: (url: string) => void;
}

export function TestDetailModal({
    test,
    open,
    onOpenChange,
    score,
    onGradeClick,
    onAnswerKeyClick,
    onDownload
}: TestDetailModalProps) {
    const { addToSchedule } = useStudent();
    const { user } = useAuth();
    const { deleteMockTest } = useMockTest();
    const [showSchedulePicker, setShowSchedulePicker] = useState(false);

    if (!test) return null;

    const SUBJECT_MAP: Record<string, string> = {
        'Korean': '국어',
        'Math': '수학',
        'English': '영어',
        'History': '한국사',
        'Science': '탐구'
    };
    const getSubjectKo = (subject: string) => SUBJECT_MAP[subject] || subject;
    const days = ['월', '화', '수', '목', '금', '토', '일'];

    const handleAddToSchedule = async (day: string) => {
        await addToSchedule(day, test.fullName);
        setShowSchedulePicker(false);
        // Optional: Show toast or confirmation
        alert(`${day}요일 스케줄에 추가되었습니다.`);
    };

    const handleDelete = async () => {
        if (confirm("정말로 이 시험지를 삭제하시겠습니까? (복구할 수 없습니다)")) {
            await deleteMockTest(test.id);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => {
            onOpenChange(v);
            if (!v) setShowSchedulePicker(false);
        }}>
            <DialogContent className="max-w-2xl">
                {/* Header Actions: Delete (Admin) & Schedule */}
                <div className="absolute right-12 top-4 z-50 flex items-center gap-1">
                    {/* Admin Delete Button */}
                    {user?.role === 'admin' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-red-600"
                            onClick={handleDelete}
                            title="시험지 삭제 (관리자)"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}

                    {/* Add to Schedule Button */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => setShowSchedulePicker(!showSchedulePicker)}
                            title="스케줄에 추가"
                        >
                            <CalendarPlus className="h-4 w-4" />
                        </Button>

                        {/* Simple Day Picker Dropdown */}
                        {showSchedulePicker && (
                            <div className="absolute right-0 top-8 bg-white border shadow-lg rounded-md p-2 w-32 grid grid-cols-2 gap-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="col-span-2 text-[10px] text-center text-muted-foreground mb-1 font-medium">요일 선택</div>
                                {days.map(day => (
                                    <button
                                        key={day}
                                        className="text-xs py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                                        onClick={() => handleAddToSchedule(day)}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogHeader>
                    <DialogTitle className="pr-8">{test.fullName}</DialogTitle>
                    <DialogDescription>
                        {test.publisher === '시대인재' ? '시대인재' : test.publisher} • {getSubjectKo(test.subject)}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col md:flex-row gap-6 mt-4">
                    {/* Thumbnail */}
                    <div className="w-full md:w-1/3 aspect-[494/706] shrink-0 overflow-hidden bg-slate-100 shadow-md border border-slate-200/60 self-start">
                        {getTestThumbnail(test.series || test.fullName) ? (
                            <img
                                src={getTestThumbnail(test.series || test.fullName)!}
                                alt={test.series || "Cover"}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 p-4 text-center">
                                <span className="text-xl font-bold leading-tight">{getSubjectKo(test.subject)}</span>
                                <span className="text-sm mt-2 opacity-75">{test.publisher}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            <Button
                                variant={score !== undefined ? "outline" : "secondary"}
                                className={`w-full justify-start h-14 text-base font-bold border transition-all ${score !== undefined
                                    ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
                                    : "border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
                                    }`}
                                onClick={onGradeClick}
                            >
                                {score !== undefined ? (
                                    <>
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[10px] text-muted-foreground font-normal mb-1">내 성적</span>
                                            <span className="text-xl">
                                                {(test.subject === '수학' || (test.subject as string) === 'Math')
                                                    ? `${score}점`
                                                    : (test.subject === '국어' || (test.subject as string) === 'Korean')
                                                        ? `${score} / 45`
                                                        : `${score} / ${test.answerKey ? Object.keys(test.answerKey).length : '-'}`
                                                }
                                            </span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 ml-auto text-primary/50" />
                                    </>
                                ) : (
                                    <>
                                        <Edit3 className="w-5 h-5 mr-3" />
                                        성적 입력 / 정답 확인
                                    </>
                                )}
                            </Button>

                            {test.examFileUrl ? (
                                <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => onDownload(test.examFileUrl!)}>
                                    <FileText className="w-5 h-5 mr-3 text-blue-500" />
                                    문제지 다운로드
                                </Button>
                            ) : (
                                <Button variant="outline" className="w-full justify-start h-12 text-base opacity-50" disabled>
                                    <FileText className="w-5 h-5 mr-3 text-muted-foreground" />
                                    문제지 (준비중)
                                </Button>
                            )}

                            {test.answerKeyImgUrl || (test.answerKey && Object.keys(test.answerKey).length > 0) ? (
                                <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => onAnswerKeyClick(test)}>
                                    <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
                                    정답표 확인
                                </Button>
                            ) : (
                                <Button variant="outline" className="w-full justify-start h-12 text-base opacity-50" disabled>
                                    <CheckCircle className="w-5 h-5 mr-3 text-muted-foreground" />
                                    정답표 (준비중)
                                </Button>
                            )}

                            {test.explanationFileUrl ? (
                                <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => onDownload(test.explanationFileUrl!)}>
                                    <HelpCircle className="w-5 h-5 mr-3 text-orange-500" />
                                    해설지 다운로드
                                </Button>
                            ) : (
                                <Button variant="outline" className="w-full justify-start h-12 text-base opacity-50" disabled>
                                    <HelpCircle className="w-5 h-5 mr-3 text-muted-foreground" />
                                    해설지 (준비중)
                                </Button>
                            )}

                            {test.listeningAudioUrl ? (
                                <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => onDownload(test.listeningAudioUrl!)}>
                                    <Headphones className="w-5 h-5 mr-3 text-purple-500" />
                                    듣기 파일 다운로드
                                </Button>
                            ) : (
                                <Button variant="outline" className="w-full justify-start h-12 text-base opacity-50" disabled>
                                    <Headphones className="w-5 h-5 mr-3 text-muted-foreground" />
                                    듣기 파일 (준비중)
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
