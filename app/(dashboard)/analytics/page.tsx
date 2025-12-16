'use client';

import { ScoreChart } from "@/components/analytics/ScoreChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="p-4 space-y-6 max-w-5xl mx-auto pb-20">
            <h1 className="text-2xl font-bold">성적 분석</h1>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">최신 점수</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">94점</div>
                        <p className="text-xs text-green-500 flex items-center mt-1">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            지난주 대비 +2점
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">상위 %</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">상위 10%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            학원 평균 대비
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">점수 추이</CardTitle>
                    <CardDescription>최근 5주간의 성적 변화입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScoreChart />
                </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <Users className="w-5 h-5 mr-2 text-primary" />
                        강사 피드백
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                        이번 주도 수고했어요! 수학 성적이 꾸준히 오르고 있네요.
                        시험 초반부에 페이스를 유지하는 것에 조금 더 집중해보아요.
                        학원 평균보다 훨씬 높은 점수를 유지하고 있습니다. 계속 화이팅!
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
