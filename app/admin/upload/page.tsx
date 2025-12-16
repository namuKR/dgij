'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Upload, Loader2, Check } from 'lucide-react';
// import * as pdfjsLib from 'pdfjs-dist'; // Moved to dynamic import inside component


import { useMockTest } from '@/lib/context/MockTestContext';
import { MockTest } from '@/lib/mockData';

const EXPECTED_PAGES = {
    'Korean': 20,
    'Math': [16, 20], // Math can be 16 or 20
    'English': 8,
    'History': 4,
    'Science': 4,
};

const SUBJECT_MAP: Record<string, string> = {
    'Korean': '국어',
    'Math': '수학',
    'English': '영어',
    'History': '한국사',
    'Science': '탐구'
};

const QUESTION_COUNT = 45; // Default max, can be adjusted per subject

export default function AdminUploadPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { addMockTest } = useMockTest();

    // Form State
    const [subject, setSubject] = useState('Korean');
    const [publisher, setPublisher] = useState('');
    const [year, setYear] = useState('2027');
    const [series, setSeries] = useState('');
    const [season, setSeason] = useState('');
    const [number, setNumber] = useState('');
    const [scanType, setScanType] = useState('Original');
    const [fullName, setFullName] = useState('');

    // File State
    const [examFile, setExamFile] = useState<File | null>(null);
    const [answerImg, setAnswerImg] = useState<File | null>(null);
    const [explanationFile, setExplanationFile] = useState<File | null>(null);
    const [listeningFile, setListeningFile] = useState<File | null>(null);

    // Answer Key State
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isAnalyzingAnswers, setIsAnalyzingAnswers] = useState(false);
    const aiAnswerInputRef = useRef<HTMLInputElement>(null);

    // Validation & Upload State
    const [uploading, setUploading] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [detectedPages, setDetectedPages] = useState(0);
    const [pageValidationPassed, setPageValidationPassed] = useState(false);

    // Effect to auto-generate Full Name
    useEffect(() => {
        const parts = [year, publisher, series];
        if (season) parts.push(season);
        if (number) parts.push(number);
        setFullName(parts.filter(Boolean).join(' '));
    }, [year, publisher, series, season, number]);

    // Cleanup worker on unmount
    useEffect(() => {
        return () => {
            // No strict cleanup needed for workerSrc global, but good to know lifecycle
        };
    }, []);

    // Global Paste Listener for Files
    useEffect(() => {
        const handleGlobalPaste = async (e: ClipboardEvent) => {
            if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
                e.preventDefault();
                const file = e.clipboardData.files[0];
                await processFile(file);
            }
        };

        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [subject]); // Depedency on subject for validation logic

    // Refs for auto-focus - ALWAYS called at top level
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Shared File Processor needs to be defined before useEffect using it, or hoisted via function keyword. 
    // Since it uses state setters, it's bound.
    // Recommended: define handleGlobalPaste inside useEffect or wrap processFile in useCallback.
    // Let's wrap processFile in useCallback and put it before useEffect? Or just suppress dependency if safe.
    // The "conditional hook" error was likely due to the "if (user...) return null" appearing BEFORE the useRef call originally?
    // Let's check where the useRef specific line was. Original file had "const inputRefs = useRef" at line 149, which is AFTER the early return at line 98!
    // FIX: Move early return to AFTER all hooks.

    const countPdfPages = async (file: File): Promise<number> => {
        try {
            // Dynamically import pdfjs-dist to avoid SSR issues
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            return pdf.numPages;
        } catch (error) {
            console.error("Error reading PDF:", error);
            return 0; // Error fallback
        }
    };

    const handleExamFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await processFile(e.target.files[0]);
        }
    };



    const isSubjective = (subj: string, qNum: number) => {
        if (subj === 'Math') {
            // Common: 16-22, Choice: 29-30
            return (qNum >= 16 && qNum <= 22) || (qNum >= 29 && qNum <= 30);
        }
        return false;
    };

    const handleAnswerChange = (qNum: number, value: string) => {
        setAnswers(prev => ({ ...prev, [qNum]: value }));

        // Auto-advance logic
        if (value.length === 1 && !isSubjective(subject, qNum)) {
            // Find next ref?
            // Note: Use a map or simple array index?
            // Since qNum maps directly to inputs, we can use qNum as index if we map it consistently.
            // Or just check if ref exists.
            const nextInput = inputRefs.current[qNum + 1]; // qNum is 1-based, refs can be 1-based too
            if (nextInput) {
                nextInput.focus();
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startQNum: number) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('text');
        if (!clipboardData) return;

        // Split by whitespace (space, tab, newline, comma)
        const values = clipboardData.split(/[\s,\t\n]+/).filter(v => v.length > 0);

        if (values.length === 0) return;

        const newAnswers = { ...answers };
        values.forEach((val, idx) => {
            // Validate: only allow digits (and maybe check max length if subjective?)
            // For now, simple digit check or trust user input (it's admin)
            if (/^\d+$/.test(val)) {
                newAnswers[startQNum + idx] = val;
            }
        });
        setAnswers(newAnswers);

        // Focus the input after the last pasted one?
        const lastQNum = startQNum + values.length;
        if (inputRefs.current[lastQNum]) {
            inputRefs.current[lastQNum]?.focus();
        }
    };

    const handleAIAnswerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzingAnswers(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/omr', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('AI Analysis failed');
            const data = await res.json();

            if (data.answers) {
                const newAnswers = { ...answers };
                Object.entries(data.answers).forEach(([k, v]) => {
                    newAnswers[Number(k)] = String(v);
                });
                setAnswers(newAnswers);
                alert(`${Object.keys(data.answers).length}개의 정답을 추출했습니다.`);
            }
        } catch (error) {
            console.error(error);
            alert('AI 분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzingAnswers(false);
            if (aiAnswerInputRef.current) aiAnswerInputRef.current.value = '';
        }
    };

    const uploadFileToR2 = async (file: File) => {
        const res = await fetch('/api/upload/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        if (!res.ok) throw new Error(`Presign failed for ${file.name}`);
        const { putUrl, key } = await res.json();

        const uploadRes = await fetch(putUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
        });

        if (!uploadRes.ok) throw new Error(`Upload failed for ${file.name}`);
        return key; // In a real app, maybe return full public URL
    };

    const handleSubmit = async () => {
        if (!examFile) return alert('시험지 파일은 필수입니다.');
        if (!publisher || !series || !fullName) return alert('필수 정보를 입력해주세요.');
        if (Object.keys(answers).length === 0) return alert('정답을 최소 1개 이상 입력해주세요.'); // Basic check
        if (subject === 'English' && !listeningFile) return alert('영어는 듣기 파일이 필수입니다.');

        // If validation failed and user hasn't overridden it yet, show the warning dialog again
        if (detectedPages > 0 && !pageValidationPassed) {
            setShowWarning(true);
            return;
        }

        setUploading(true);
        try {
            // Upload Files Parallel
            const uploads = [];
            uploads.push(uploadFileToR2(examFile).then(key => ({ type: 'exam', key })));

            if (answerImg) uploads.push(uploadFileToR2(answerImg).then(key => ({ type: 'answerVal', key }))); // typo 'answerVal' -> answerImg logic
            if (explanationFile) uploads.push(uploadFileToR2(explanationFile).then(key => ({ type: 'explanation', key })));
            if (listeningFile) uploads.push(uploadFileToR2(listeningFile).then(key => ({ type: 'listening', key })));

            const results = await Promise.all(uploads);
            const fileKeys: Record<string, string> = {};
            results.forEach(r => fileKeys[r.type] = r.key);

            // Construct Final Object (Mock)
            const mockTestObject: MockTest = {
                id: `test-${Date.now()}`, // Generate simple unique ID
                subject: subject as any, // Cast to match union type
                publisher,
                year: Number(year),
                series,
                season,
                number,
                fullName,
                examFileUrl: fileKeys['exam'],
                answerKeyImgUrl: fileKeys['answerVal'], // Logic fix for var name
                explanationFileUrl: fileKeys['explanation'],
                listeningAudioUrl: fileKeys['listening'],
                answerKey: Object.fromEntries(
                    Object.entries(answers).map(([k, v]) => [Number(k), Number(v)])
                ),
                scanType: scanType as 'Original' | 'OCR' | 'Scan'
            };

            console.log('UPLOAD SUCCESS:', mockTestObject);

            // Add to Global Context
            addMockTest(mockTestObject);

            alert('모의고사가 등록되었습니다.');
            router.push('/contents'); // Redirect to contents page

        } catch (error) {
            console.error(error);
            alert('업로드 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
        }
    };

    // Drag & Drop State
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Only disable if we left the main window or dropped
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            await processFile(file); // Refactored out shared logic
        }
    };

    // Shared File Processor (Paste + Drop)
    const processFile = async (file: File, target: 'exam' | 'explanation' | 'auto' = 'auto') => {
        // 1. Explicit Targets
        if (target === 'exam') {
            if (file.type !== 'application/pdf') {
                alert('시험지는 PDF 파일이어야 합니다.');
                return;
            }
            setExamFile(file);
            setDetectedPages(0);
            setPageValidationPassed(false);

            // Re-use validation logic
            if (subject && EXPECTED_PAGES[subject as keyof typeof EXPECTED_PAGES]) {
                const pages = await countPdfPages(file);
                setDetectedPages(pages);
                const expected = EXPECTED_PAGES[subject as keyof typeof EXPECTED_PAGES];
                const isValid = Array.isArray(expected) ? expected.includes(pages) : pages === expected;
                if (isValid) setPageValidationPassed(true);
                else setShowWarning(true);
            } else {
                setPageValidationPassed(true);
            }
            alert(`시험지 파일이 업로드 되었습니다: ${file.name}`);
            return;
        }

        if (target === 'explanation') {
            // Optional: check file type if needed, but explanation can be PDF or others? Assuming default is PDF/Any
            setExplanationFile(file);
            alert(`해설지 파일이 업로드 되었습니다: ${file.name}`);
            return;
        }

        // 2. Auto-Detection (Default behavior)
        if (file.type === 'application/pdf') {
            // Default PDF -> Exam
            processFile(file, 'exam');

        } else if (file.type.startsWith('image/')) {
            setAnswerImg(file);
            alert(`정답표 이미지가 업로드 되었습니다: ${file.name}`);

        } else if (file.type.startsWith('audio/')) {
            if (subject === 'English') {
                setListeningFile(file);
                alert(`듣기 파일이 업로드 되었습니다: ${file.name}`);
            } else {
                alert(`현재 과목(${SUBJECT_MAP[subject]})은 듣기 파일을 지원하지 않습니다.`);
            }
        }
    };

    return (
        <div
            className="min-h-screen bg-slate-50 p-6 flex flex-col items-center pb-20 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-xl flex items-center justify-center animate-in fade-in duration-200 pointer-events-none">
                    <div className="bg-white p-8 rounded-full shadow-2xl flex flex-col items-center animate-bounce">
                        <Upload className="w-12 h-12 text-blue-500 mb-2" />
                        <span className="text-lg font-bold text-slate-700">파일을 여기에 놓으세요</span>
                    </div>
                </div>
            )}

            <div className="w-full max-w-4xl mb-4">
                <Button variant="ghost" onClick={() => router.push('/')} className="pl-0">
                    <ArrowLeft className="w-4 h-4 mr-2" /> 홈으로 이동
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                {/* Meta Info Input */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>1. 시험 정보 입력</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>과목 (필수)</Label>
                                <Select value={subject} onValueChange={setSubject}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Korean">국어</SelectItem>
                                        <SelectItem value="Math">수학</SelectItem>
                                        <SelectItem value="English">영어</SelectItem>
                                        <SelectItem value="History">한국사</SelectItem>
                                        <SelectItem value="Science">탐구</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>연도 (필수)</Label>
                                <Input value={year} onChange={e => setYear(e.target.value)} type="number" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>출판사 (필수)</Label>
                            <Input value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="예: 시대인재" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>시리즈 (필수)</Label>
                                <Input value={series} onChange={e => setSeries(e.target.value)} placeholder="예: 서바이벌" />
                            </div>
                            <div className="space-y-2">
                                <Label>시즌 (선택)</Label>
                                <Input value={season} onChange={e => setSeason(e.target.value)} placeholder="예: 시즌 1" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>회차 (선택)</Label>
                                <Input value={number} onChange={e => setNumber(e.target.value)} placeholder="예: 1회" />
                            </div>
                            <div className="space-y-2">
                                <Label>스캔 유형 (필수)</Label>
                                <Select value={scanType} onValueChange={setScanType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Original">원본</SelectItem>
                                        <SelectItem value="OCR">OCR</SelectItem>
                                        <SelectItem value="Scan">스캔</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>전체 이름 (자동 생성 + 수정 가능)</Label>
                            <Input
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="자동 생성된 이름"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* File Uploads */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>2. 파일 업로드</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Exam File */}
                            <div className="space-y-2">
                                <Label>시험지 PDF (필수)</Label>
                                <div
                                    className="border border-dashed rounded-lg p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                            processFile(e.dataTransfer.files[0], 'exam');
                                        }
                                    }}
                                >
                                    <Input type="file" onChange={handleExamFileChange} accept=".pdf" />
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-muted-foreground">
                                            {SUBJECT_MAP[subject]} 예상: {Array.isArray(EXPECTED_PAGES[subject as keyof typeof EXPECTED_PAGES])
                                                ? (EXPECTED_PAGES[subject as keyof typeof EXPECTED_PAGES] as number[]).join(' or ')
                                                : EXPECTED_PAGES[subject as keyof typeof EXPECTED_PAGES]}p
                                        </span>
                                        {detectedPages > 0 && (
                                            <span className={`text-xs font-bold ${pageValidationPassed ? 'text-green-600' : 'text-red-500'}`}>
                                                감지됨: {detectedPages}p
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Listening File - Show only for English */}
                            {subject === 'English' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-primary font-bold">영어 듣기 파일 (필수)</Label>
                                    <Input type="file" onChange={e => setListeningFile(e.target.files?.[0] || null)} accept="audio/*" />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>정답표 이미지 (선택)</Label>
                                <Input type="file" onChange={e => setAnswerImg(e.target.files?.[0] || null)} accept="image/*" />
                            </div>

                            <div className="space-y-2">
                                <Label>해설지 파일 (선택)</Label>
                                <div
                                    className="border border-dashed rounded-lg p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                            processFile(e.dataTransfer.files[0], 'explanation');
                                        }
                                    }}
                                >
                                    <Input type="file" onChange={e => setExplanationFile(e.target.files?.[0] || null)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Answer Key Input */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>3. 정답 입력</CardTitle>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => aiAnswerInputRef.current?.click()}
                                    disabled={isAnalyzingAnswers}
                                >
                                    {isAnalyzingAnswers ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    AI 정답 추출
                                </Button>
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={aiAnswerInputRef}
                                    onChange={handleAIAnswerUpload}
                                    accept="image/*"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                                {subject === 'Korean' ? (
                                    <>
                                        <div>
                                            <Label className="text-sm font-semibold mb-2 block text-primary bg-primary/10 p-1 px-2 rounded w-fit">공통 (1~34)</Label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {Array.from({ length: 34 }).map((_, i) => (
                                                    <div key={i} className="flex flex-col items-center">
                                                        <span className="text-[10px] text-muted-foreground mb-1">{i + 1}</span>
                                                        <Input
                                                            ref={el => { inputRefs.current[i + 1] = el }}
                                                            className="h-8 w-10 text-center text-sm p-0"
                                                            maxLength={1}
                                                            value={answers[i + 1] || ''}
                                                            onChange={(e) => handleAnswerChange(i + 1, e.target.value)}
                                                            onPaste={(e) => handlePaste(e, i + 1)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-semibold mb-2 block text-muted-foreground bg-muted p-1 px-2 rounded w-fit">선택: 화법과 작문</Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {Array.from({ length: 11 }).map((_, i) => {
                                                        const qNum = 35 + i;
                                                        return (
                                                            <div key={qNum} className="flex flex-col items-center">
                                                                <span className="text-[10px] text-muted-foreground mb-1">{qNum}</span>
                                                                <Input
                                                                    ref={el => { inputRefs.current[qNum] = el }}
                                                                    className="h-8 w-10 text-center text-sm p-0"
                                                                    maxLength={1}
                                                                    value={answers[qNum] || ''}
                                                                    onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                                                                    onPaste={(e) => handlePaste(e, qNum)}
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-semibold mb-2 block text-muted-foreground bg-muted p-1 px-2 rounded w-fit">선택: 언어와 매체</Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {Array.from({ length: 11 }).map((_, i) => {
                                                        const qNum = 35 + i;
                                                        const key = 100 + qNum; // Offset 100 for choice 2
                                                        return (
                                                            <div key={key} className="flex flex-col items-center">
                                                                <span className="text-[10px] text-muted-foreground mb-1">{qNum}</span>
                                                                <Input
                                                                    ref={el => { inputRefs.current[key] = el }}
                                                                    className="h-8 w-10 text-center text-sm p-0"
                                                                    maxLength={1}
                                                                    value={answers[key] || ''}
                                                                    onChange={(e) => handleAnswerChange(key, e.target.value)}
                                                                    onPaste={(e) => handlePaste(e, key)} // Paste maps relative to THIS key index
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : subject === 'Math' ? (
                                    <>
                                        <div>
                                            <Label className="text-sm font-semibold mb-2 block text-primary bg-primary/10 p-1 px-2 rounded w-fit">공통 (1~22)</Label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {Array.from({ length: 22 }).map((_, i) => (
                                                    <div key={i} className="flex flex-col items-center">
                                                        <span className="text-[10px] text-muted-foreground mb-1">{i + 1}</span>
                                                        <Input
                                                            ref={el => { inputRefs.current[i + 1] = el }}
                                                            className="h-8 w-10 text-center text-sm p-0"
                                                            maxLength={isSubjective('Math', i + 1) ? 3 : 1}
                                                            value={answers[i + 1] || ''}
                                                            onChange={(e) => handleAnswerChange(i + 1, e.target.value)}
                                                            onPaste={(e) => handlePaste(e, i + 1)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-semibold mb-2 block text-muted-foreground bg-muted p-1 px-2 rounded w-fit">선택: 확률과 통계</Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {Array.from({ length: 8 }).map((_, i) => {
                                                        const qNum = 23 + i;
                                                        return (
                                                            <div key={qNum} className="flex flex-col items-center">
                                                                <span className="text-[10px] text-muted-foreground mb-1">{qNum}</span>
                                                                <Input
                                                                    ref={el => { inputRefs.current[qNum] = el }}
                                                                    className="h-8 w-10 text-center text-sm p-0"
                                                                    maxLength={isSubjective('Math', qNum) ? 3 : 1}
                                                                    value={answers[qNum] || ''}
                                                                    onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                                                                    onPaste={(e) => handlePaste(e, qNum)}
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-semibold mb-2 block text-muted-foreground bg-muted p-1 px-2 rounded w-fit">선택: 미적분</Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {Array.from({ length: 8 }).map((_, i) => {
                                                        const qNum = 23 + i;
                                                        const key = 100 + qNum; // Offset 100 for choice 2
                                                        return (
                                                            <div key={key} className="flex flex-col items-center">
                                                                <span className="text-[10px] text-muted-foreground mb-1">{qNum}</span>
                                                                <Input
                                                                    ref={el => { inputRefs.current[key] = el }}
                                                                    className="h-8 w-10 text-center text-sm p-0"
                                                                    maxLength={isSubjective('Math', qNum) ? 3 : 1}
                                                                    value={answers[key] || ''}
                                                                    onChange={(e) => handleAnswerChange(key, e.target.value)}
                                                                    onPaste={(e) => handlePaste(e, key)}
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-5 gap-2">
                                        {Array.from({
                                            length: (subject === 'History' || subject === 'Science') ? 20 : QUESTION_COUNT
                                        }).map((_, i) => (
                                            <div key={i} className="flex flex-col items-center">
                                                <span className="text-[10px] text-muted-foreground mb-1">{i + 1}</span>
                                                <Input
                                                    ref={el => { inputRefs.current[i + 1] = el }}
                                                    className="h-8 w-10 text-center text-sm p-0"
                                                    maxLength={1}
                                                    value={answers[i + 1] || ''}
                                                    onChange={(e) => handleAnswerChange(i + 1, e.target.value)}
                                                    onPaste={(e) => handlePaste(e, i + 1)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Button className="w-full h-12 text-lg" onClick={handleSubmit} disabled={uploading}>
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                업로드 중...
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5 mr-2" />
                                모의고사 등록 완료
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Warning Dialog */}
            <Dialog open={showWarning} onOpenChange={setShowWarning}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-amber-600">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            페이지 수 불일치
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            선택하신 파일은 <strong>{detectedPages}페이지</strong>입니다.<br />
                            {SUBJECT_MAP[subject]} 과목의 권장 페이지 수는 <strong>
                                {Array.isArray(EXPECTED_PAGES[subject as keyof typeof EXPECTED_PAGES])
                                    ? (EXPECTED_PAGES[subject as keyof typeof EXPECTED_PAGES] as number[]).join(' 또는 ')
                                    : EXPECTED_PAGES[subject as keyof typeof EXPECTED_PAGES]}페이지
                            </strong>입니다.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setExamFile(null); // Clear file
                            setShowWarning(false);
                            // Also clear the input visual if possible, but React state manages clear logic mainly
                        }}>
                            파일 다시 선택
                        </Button>
                        <Button variant="destructive" onClick={() => {
                            setPageValidationPassed(true);
                            setShowWarning(false);
                        }}>
                            강제 업로드
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
