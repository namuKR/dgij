import { Input } from "@/components/ui/input";
import { Search, CheckCircle } from "lucide-react";
import { useState } from "react";
import { MockTest } from "@/lib/mockData";
import { getTestThumbnail } from "@/lib/utils";

interface ScheduleContentSelectorProps {
    mockTests: MockTest[];
    selectedTestId: string | null;
    onSelect: (testId: string) => void;
}

export function ScheduleContentSelector({ mockTests, selectedTestId, onSelect }: ScheduleContentSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const SUBJECT_MAP: Record<string, string> = {
        'Korean': '국어',
        'Math': '수학',
        'English': '영어',
        'History': '한국사',
        'Science': '탐구'
    };

    const filteredTests = mockTests.filter(test =>
        (test.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (test.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (test.publisher || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder="시험지 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="h-[50vh] max-h-[440px] min-h-[300px] pr-2 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredTests.map((test) => {
                        const thumbnail = getTestThumbnail(test.series || test.fullName);
                        const subjectKo = SUBJECT_MAP[test.subject] || test.subject;
                        const isSelected = selectedTestId === test.id;

                        return (
                            <div
                                key={test.id}
                                onClick={() => onSelect(test.id)}
                                className={`
                                    relative flex items-center p-2 rounded-lg border cursor-pointer transition-all
                                    ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border hover:bg-accent/50'}
                                `}
                            >
                                {/* Thumbnail */}
                                <div className="relative w-12 aspect-[494/706] shrink-0 overflow-hidden bg-slate-100 rounded-sm border border-slate-200/60 mr-3">
                                    {thumbnail ? (
                                        <img src={thumbnail} alt={test.series || "Cover"} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 text-[8px] text-center leading-tight p-0.5">
                                            <span className="font-bold">{subjectKo}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium line-clamp-2 leading-tight mb-1 break-keep">
                                        {test.fullName}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground line-clamp-1">
                                        {test.publisher}
                                    </div>
                                </div>

                                {/* Selection Indicator */}
                                {isSelected && (
                                    <div className="absolute top-2 right-2 text-primary">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filteredTests.length === 0 && (
                        <div className="col-span-full text-center text-sm text-muted-foreground py-12 flex flex-col items-center justify-center h-full">
                            <p>검색 결과가 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
