"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface PDFViewerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string | null;
    page: number;
    title: string;
}

export function PDFViewerModal({ open, onOpenChange, url, page, title }: PDFViewerModalProps) {
    if (!url) return null;

    // R2 URL construction assumed to be handled by caller or we handle it here if passed as relative
    const fullUrl = url.startsWith('http')
        ? url
        : `https://pub-c45c0bdedae9472188e6d86b016bf763.r2.dev/${url}`;

    const pdfUrl = `${fullUrl}#page=${page}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        {title}
                        <span className="text-muted-foreground font-normal text-sm">- Page {page}</span>
                        <Button variant="ghost" size="sm" asChild className="ml-auto h-8 gap-1 text-xs">
                            <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3" />
                                전체 열기
                            </a>
                        </Button>
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 bg-slate-100 w-full h-full p-0 overflow-hidden">
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full border-0"
                        title="PDF Viewer"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
