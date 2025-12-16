"use client";

import { useState, useMemo } from 'react';
import { useMockTest } from "@/lib/context/MockTestContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Search input
import { Download, CheckCircle, Search, Folder, ChevronRight, ArrowLeft, FolderOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStudent } from '@/lib/context/StudentContext';
import { MockTest } from '@/lib/mockData';
import { GradeInputModal } from "@/components/dashboard/GradeInputModal";
import { ResultComparisonModal } from "@/components/dashboard/ResultComparisonModal";
import { TestDetailModal } from "@/components/dashboard/TestDetailModal";
import { cn, getTestThumbnail } from "@/lib/utils";

export default function ContentsPage() {
    const SUBJECT_MAP: Record<string, string> = {
        'Korean': '국어',
        'Math': '수학',
        'English': '영어',
        'History': '한국사',
        'Science': '탐구'
    };
    const SCAN_TYPE_MAP: Record<string, string> = {
        'Original': '원본',
        'OCR': 'OCR',
        'Scan': '스캔'
    };

    const { mockTests } = useMockTest();
    const { studentData } = useStudent();

    // --- Navigation State ---
    const [viewMode, setViewMode] = useState<'home' | 'provider'>('home');
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(''); // Global search
    const [isSearchExpanded, setIsSearchExpanded] = useState(false); // New state for search expansion
    const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
    const [selectedSubject, setSelectedSubject] = useState<string | 'ALL'>('ALL');

    // --- Modal State ---
    const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [viewingTestForKey, setViewingTestForKey] = useState<MockTest | null>(null);
    const [showFormatDialog, setShowFormatDialog] = useState(false);

    // --- Derived Data ---
    const uniqueProviders = useMemo(() => {
        const providers = new Set(mockTests.map(t => t.publisher));
        return Array.from(providers).sort();
    }, [mockTests]);

    const filteredTests = useMemo(() => {
        if (viewMode === 'home') {
            // If searching in home mode
            if (!searchQuery && !isSearchExpanded) return []; // Allow empty search if just expanded? Or behave same.
            // If expanded, maybe show everything? or just wait for input. Let's keep existing logic: show if query exists.
            if (!searchQuery) return [];
            return mockTests.filter(t => t.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // Provider Mode
        let tests = mockTests.filter(t => t.publisher === selectedProvider);

        if (selectedYear !== 'ALL') {
            tests = tests.filter(t => t.year === selectedYear);
        }

        if (selectedSubject !== 'ALL') {
            tests = tests.filter(t => t.subject === selectedSubject);
        }

        // Sort by Year Descending by default as requested
        return tests.sort((a, b) => b.year - a.year);
    }, [viewMode, searchQuery, mockTests, selectedProvider, selectedYear, selectedSubject, isSearchExpanded]);

    const providerYears = useMemo(() => {
        if (!selectedProvider) return [];
        const tests = mockTests.filter(t => t.publisher === selectedProvider);
        const years = new Set(tests.map(t => t.year));
        return Array.from(years).sort((a, b) => b - a); // Descending
    }, [mockTests, selectedProvider]);

    const providerSubjects = useMemo(() => {
        if (!selectedProvider) return [];
        const tests = mockTests.filter(t => t.publisher === selectedProvider);
        const subjects = new Set(tests.map(t => t.subject));
        // Sort effectively? Map specific order if needed
        return Array.from(subjects);
    }, [mockTests, selectedProvider]);


    // --- Handlers ---
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

    const getSubjectKo = (subject: string) => SUBJECT_MAP[subject] || subject;
    const getScanTypeDisplay = (scanType?: string) => scanType ? SCAN_TYPE_MAP[scanType] : '원본';
    const selectedTestScore = selectedTest && studentData?.scores?.find(s => s.testId === selectedTest.id)?.score;
    const viewingScore = viewingTestForKey && studentData?.scores?.find(s => s.testId === viewingTestForKey.id);

    const handleProviderClick = (provider: string) => {
        setSelectedProvider(provider);
        setViewMode('provider');
        setSelectedYear('ALL');
        setSelectedSubject('ALL');
        setIsSearchExpanded(false); // Ensure search is collapsed when entering provider
    };

    const goBack = () => {
        setViewMode('home');
        setSelectedProvider(null);
        setSearchQuery('');
    };

    // --- Render Helpers ---

    const renderTestGrid = (tests: MockTest[]) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {tests.map((test) => {
                const thumbnail = getTestThumbnail(test.series || test.fullName);
                const subjectKo = getSubjectKo(test.subject);
                const publisherDisplay = test.publisher === '시대인재' ? '시대인재' : test.publisher;
                const scanTypeDisplay = getScanTypeDisplay(test.scanType);
                const isApplied = studentData?.appliedTests?.includes(test.id);

                return (
                    <Card
                        key={test.id}
                        onClick={() => setSelectedTest(test)}
                        className={`hover:shadow-md hover:border-primary/50 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer group border ${isApplied ? 'bg-green-50/30 border-green-200' : 'bg-white border-slate-200'}`}
                    >
                        <div className="flex p-3 gap-3 items-center">
                            {/* Smaller Thumbnail */}
                            <div className="relative w-14 aspect-[494/706] shrink-0 overflow-hidden bg-slate-100 border border-slate-200 rounded-sm">
                                {isApplied && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                                        <CheckCircle className="text-white w-4 h-4" />
                                    </div>
                                )}
                                {thumbnail ? (
                                    <img src={thumbnail} alt={test.series || "Cover"} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-[8px] text-center p-0.5 text-slate-500">
                                        <span>{subjectKo}</span>
                                    </div>
                                )}
                            </div>

                            {/* Compact Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.5 bg-primary/5 text-primary text-[9px] font-bold rounded">
                                        {test.year}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-medium rounded border border-slate-200">
                                        {subjectKo}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-medium rounded border border-slate-200">
                                        {scanTypeDisplay}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-sm leading-tight line-clamp-2 break-keep group-hover:text-primary transition-colors">
                                    {test.fullName}
                                </h3>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-50/50">

            {/* --- Main Content Area --- */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'home' ? (
                    <div className="flex flex-col h-full">
                        {/* Unified Top Header with Divider */}
                        {(!isSearchExpanded) && (
                            <div className="bg-white border-b px-6 py-4 md:px-8 shrink-0 z-10">
                                <header>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent flex items-center gap-3">
                                        <Folder className="w-8 h-8 text-cyan-500" />
                                        컨텐츠
                                    </h1>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        모의고사 및 학습 자료 라이브러리
                                    </p>
                                </header>
                            </div>
                        )}

                        <div className={`flex-1 overflow-hidden ${isSearchExpanded ? 'flex flex-col' : 'grid grid-cols-1 md:grid-cols-2'}`}>
                            {/* LEFT: Provider List - Hidden when search is expanded */}
                            {!isSearchExpanded && (
                                <div className="bg-white border-r h-full overflow-y-auto p-6 md:p-8">
                                    <h2 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5 text-primary" />
                                        출제 기관별
                                    </h2>
                                    <div className="space-y-2">
                                        {uniqueProviders.map(provider => (
                                            <button
                                                key={provider}
                                                onClick={() => handleProviderClick(provider)}
                                                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between group border border-transparent hover:border-slate-200"
                                            >
                                                <span className="font-medium text-slate-700 group-hover:text-slate-900">{provider}</span>
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* RIGHT: Global Search - Expands to full width */}
                            <div className={`h-full bg-slate-50/50 flex flex-col p-6 md:p-8 ${isSearchExpanded ? 'w-full max-w-5xl mx-auto' : ''}`}>
                                <h2 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2 transition-all">
                                    {isSearchExpanded && (
                                        <Button variant="ghost" size="icon" className="-ml-2 mr-1" onClick={() => setIsSearchExpanded(false)}>
                                            <ArrowLeft className="w-5 h-5" />
                                        </Button>
                                    )}
                                    <Search className="w-5 h-5 text-primary" />
                                    검색
                                </h2>
                                <div className="relative mb-6">
                                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isSearchExpanded ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <Input
                                        className={`pl-10 h-12 text-lg bg-white shadow-sm transition-all duration-300 ${isSearchExpanded ? 'ring-2 ring-primary/20' : ''}`}
                                        placeholder={isSearchExpanded ? "검색어를 입력하세요..." : "시험지 이름으로 검색..."}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setIsSearchExpanded(true)}
                                    />
                                </div>

                                {/* Search Results */}
                                <div className="flex-1 overflow-y-auto">
                                    {searchQuery ? (
                                        filteredTests.length > 0 ? (
                                            renderTestGrid(filteredTests)
                                        ) : (
                                            <div className="text-center text-muted-foreground py-10">
                                                검색 결과가 없습니다.
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 pb-20">
                                            <Search className="w-16 h-16 mb-4" />
                                            <p>
                                                {isSearchExpanded
                                                    ? "검색어를 입력하면 결과가 나타납니다."
                                                    : "검색어를 입력하거나 좌측에서 제공처를 선택하세요."
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    // </div>
                ) : (
                    // --- PROVIDER DETAIL VIEW ---
                    <div className="h-full flex flex-col bg-white">
                        {/* Header / Breadcrumbs */}
                        <div className="border-b px-6 py-4 flex items-center bg-white shadow-sm z-10">
                            <Button variant="ghost" size="sm" onClick={goBack} className="mr-2 text-muted-foreground">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                            </Button>
                            <nav className="flex items-center text-sm font-medium">
                                <span className="text-muted-foreground hover:text-foreground cursor-pointer" onClick={goBack}>출제 기관</span>
                                <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
                                <span className="text-primary font-bold text-lg">{selectedProvider}</span>
                            </nav>
                        </div>

                        {/* Filters & Content */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50">
                            {/* Year Filter */}
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Year</div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant={selectedYear === 'ALL' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedYear('ALL')}
                                        className="h-8 rounded-full"
                                    >
                                        ALL
                                    </Button>
                                    {providerYears.map(year => (
                                        <Button
                                            key={year}
                                            variant={selectedYear === year ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedYear(year)}
                                            className="h-8 rounded-full"
                                        >
                                            {year}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Subject Filter */}
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant={selectedSubject === 'ALL' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedSubject('ALL')}
                                        className="h-8 rounded-full"
                                    >
                                        ALL
                                    </Button>
                                    {providerSubjects.map(subj => (
                                        <Button
                                            key={subj}
                                            variant={selectedSubject === subj ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedSubject(subj)}
                                            className="h-8 rounded-full"
                                        >
                                            {getSubjectKo(subj)}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Results Grid */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-700">
                                        Exams <span className="text-muted-foreground text-sm font-normal">({filteredTests.length})</span>
                                    </h3>
                                </div>
                                {filteredTests.length > 0 ? (
                                    renderTestGrid(filteredTests)
                                ) : (
                                    <div className="text-center py-20 border-2 border-dashed rounded-xl ">
                                        <p className="text-muted-foreground">해당 조건의 시험지가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* --- Modals (Preserved) --- */}
            <TestDetailModal
                test={selectedTest}
                open={!!selectedTest}
                onOpenChange={(open) => !open && setSelectedTest(null)}
                score={selectedTestScore ?? undefined}
                onGradeClick={() => setIsGradeModalOpen(true)}
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

            <GradeInputModal
                testName={selectedTest?.fullName || null}
                open={isGradeModalOpen}
                onOpenChange={setIsGradeModalOpen}
            />

            <ResultComparisonModal
                open={!!viewingTestForKey && !showFormatDialog}
                onOpenChange={(open) => !open && setViewingTestForKey(null)}
                test={viewingTestForKey}
                score={viewingScore ?? undefined}
            />
        </div >
    );
}
