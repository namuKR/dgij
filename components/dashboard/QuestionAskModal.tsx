"use client";

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Crop, Printer, X, RefreshCcw } from "lucide-react";

interface QuestionAskModalProps {
    open: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    pageNumber: number;
    testName: string;
    subjectKey: string; // e.g., 'Math' (for config lookup if needed) or display string
    selectionName?: string; // e.g., '미적분'
    questionNumber: number;
    userAnswer?: number;
    correctAnswer: number;
}

export function QuestionAskModal({
    open,
    onClose,
    pdfUrl,
    pageNumber,
    testName,
    subjectKey, // passed as raw subject usually
    selectionName,
    questionNumber,
    userAnswer,
    correctAnswer
}: QuestionAskModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'crop' | 'preview'>('crop');
    const [pdfError, setPdfError] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selection, setSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);

    const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);

    // Load and Render PDF
    useEffect(() => {
        if (!open || !pdfUrl || step !== 'crop') return;

        let isMounted = true;
        const loadPdf = async () => {
            setLoading(true);
            setPdfError(null);
            try {
                // Dynamic import
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

                // Construct full URL if needed
                const fullUrl = pdfUrl.startsWith('http')
                    ? pdfUrl
                    : `https://pub-c45c0bdedae9472188e6d86b016bf763.r2.dev/${pdfUrl}`;

                const loadingTask = pdfjsLib.getDocument(fullUrl);
                const pdf = await loadingTask.promise;

                if (pageNumber > pdf.numPages || pageNumber < 1) {
                    throw new Error(`Page ${pageNumber} out of range (Total: ${pdf.numPages})`);
                }

                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 1.5 }); // Good quality scale

                const canvas = canvasRef.current;
                if (!canvas) return;

                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                if (isMounted) {
                    await page.render(renderContext).promise;
                }
            } catch (err: any) {
                console.error("PDF Render Error:", err);
                if (isMounted) setPdfError("PDF를 불러오는데 실패했습니다.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadPdf();

        return () => { isMounted = false; };
    }, [open, pdfUrl, pageNumber, step]);

    // Cleanup object URL
    useEffect(() => {
        return () => {
            if (croppedImageUrl) URL.revokeObjectURL(croppedImageUrl);
        };
    }, [croppedImageUrl]);

    // Mouse Events for Cropping
    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        const { x, y } = getCoordinates(e);
        setIsDragging(true);
        setStartPos({ x, y });
        setSelection({ x, y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !startPos) return;
        const { x, y } = getCoordinates(e);
        const w = x - startPos.x;
        const h = y - startPos.y;
        setSelection({ x: startPos.x, y: startPos.y, w, h });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // Normalize selection (handle negative width/height)
        if (selection) {
            let { x, y, w, h } = selection;
            if (w < 0) { x += w; w = Math.abs(w); }
            if (h < 0) { y += h; h = Math.abs(h); }
            setSelection({ x, y, w, h });
        }
    };

    const handleCrop = () => {
        if (!canvasRef.current || !selection || selection.w < 10 || selection.h < 10) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Calculate the scale factor between the internal canvas size and the displayed size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const { x, y, w, h } = selection;

        // Apply scale to coordinates
        const sourceX = x * scaleX;
        const sourceY = y * scaleY;
        const sourceW = w * scaleX;
        const sourceH = h * scaleY;

        // Create a new canvas for the cropped image
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = sourceW;
        cropCanvas.height = sourceH;
        const ctx = cropCanvas.getContext('2d');
        if (!ctx) return;

        // Draw the cropped portion
        ctx.drawImage(canvas, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);

        // Convert to blob/url
        cropCanvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                setCroppedImageUrl(url);
                setStep('preview');
            }
        }, 'image/png');
    };

    const handlePrint = () => {
        window.print();
    };

    const reset = () => {
        setSelection(null);
        setStep('crop');
        setPdfError(null);
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col bg-slate-50 [&>button]:hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-white no-print">
                    <h2 className="text-lg font-bold">
                        {step === 'crop' ? '문제 영역 선택' : '인쇄 미리보기'}
                    </h2>
                    <div className="flex gap-2">
                        {step === 'preview' && (
                            <Button variant="outline" size="sm" onClick={reset}>
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                다시 선택
                            </Button>
                        )}
                        {step === 'crop' && (
                            <Button size="sm" onClick={handleCrop} disabled={!selection || selection.w < 10}>
                                <Crop className="w-4 h-4 mr-2" />
                                자르기 완료
                            </Button>
                        )}
                        {step === 'preview' && (
                            <Button size="sm" onClick={handlePrint} className="bg-slate-900">
                                <Printer className="w-4 h-4 mr-2" />
                                인쇄하기
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-slate-100 flex justify-center p-4 relative" ref={containerRef}>
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}

                    {pdfError && (
                        <div className="flex flex-col items-center justify-center text-red-500">
                            <p>{pdfError}</p>
                            <Button variant="link" onClick={() => reset()}>다시 시도</Button>
                        </div>
                    )}

                    {/* CROP STEP */}
                    <div className={`${step === 'crop' ? 'block' : 'hidden'} relative shadow-lg`}>
                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={handleMouseDown}
                            onTouchMove={handleMouseMove}
                            onTouchEnd={handleMouseUp}
                            className="bg-white cursor-crosshair max-w-full"
                        />
                        {/* Selection Overlay */}
                        {selection && (
                            <div
                                className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
                                style={{
                                    left: selection.w > 0 ? selection.x : selection.x + selection.w,
                                    top: selection.h > 0 ? selection.y : selection.y + selection.h,
                                    width: Math.abs(selection.w),
                                    height: Math.abs(selection.h)
                                }}
                            />
                        )}
                    </div>

                    {/* PREVIEW STEP aka PRINT LAYOUT */}
                    {step === 'preview' && croppedImageUrl && (
                        <div className="print-container bg-white shadow-xl flex flex-col h-full w-full max-w-[297mm] mx-auto p-12 relative aspect-[297/210]">
                            {/* Logo */}
                            <div className="mb-4">
                                <img src="/dgijlogo.jpeg" alt="DGIJ Logo" className="h-8 object-contain" />
                            </div>

                            {/* Cropped Image - Left Aligned */}
                            <div className="flex-1 flex items-start justify-start overflow-hidden">
                                <img src={croppedImageUrl} alt="Problem" className="max-w-[50%] object-contain" />
                            </div>

                            {/* Footer Info */}
                            <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-end text-sm">
                                <div className="font-bold text-slate-700">
                                    문제 출처 | {testName} {(() => {
                                        const isMath = subjectKey === 'Math' || subjectKey === '수학';
                                        const isKorean = subjectKey === 'Korean' || subjectKey === '국어';

                                        if (isMath) {
                                            if (questionNumber <= 22) return '공통';
                                            return selectionName || '선택';
                                        }
                                        if (isKorean) {
                                            if (questionNumber <= 34) return '공통';
                                            return selectionName || '선택';
                                        }
                                        return selectionName || '';
                                    })()} {questionNumber}번
                                </div>
                                <div className="font-bold text-slate-900 text-base">
                                    원 정답: <span className="text-green-600">{correctAnswer}</span> | 내 정답: <span className="text-red-500">{userAnswer ?? '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>

            {/* Print CSS */}
            <style jsx global>{`
                @media print {
                    @page { 
                        size: A4 landscape; 
                        margin: 0mm; 
                    }
                    html, body { 
                        width: 100%;
                        height: 100%;
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow: hidden !important; 
                    }
                    body * { 
                        visibility: hidden; 
                    }
                    .print-container, .print-container * { 
                        visibility: visible; 
                    }
                    .print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        max-height: 190mm !important; /* Force fit within A4 (210mm) minus margins */
                        margin: 0 !important;
                        padding: 10mm !important; 
                        box-sizing: border-box;
                        background: white !important;
                        z-index: 9999;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: hidden !important;
                        page-break-after: avoid;
                        page-break-inside: avoid;
                    }
                    .no-print { 
                        display: none !important; 
                    }
                }
            `}</style>
        </Dialog>
    );
}
