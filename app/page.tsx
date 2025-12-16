'use client';

import { useAuth } from "@/lib/context/AuthContext";
import { ScheduleTable } from "@/components/dashboard/ScheduleTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { BookOpen, PenTool } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null; // AuthContext handles redirect

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto pt-8">
      <link rel="icon" href="/favicon.png" sizes="any" />
      <header className="flex justify-between items-start mb-6">
        <div className="flex items-center">
          <img src="/dgijlogo.jpeg" alt="DnJ Logo" className="h-10 w-auto object-contain" />
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="font-semibold">반갑습니다, <span className="text-primary">{user.name}</span>님</p>
            <p className="text-sm text-muted-foreground text-red-500">
              2027 수능 <span className="font-bold">D-{Math.ceil((new Date('2026-11-19').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}</span>
            </p>
          </div>
        </div>
      </header>

      <ScheduleTable />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => router.push('/contents')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>컨텐츠 보관함</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              수업 자료 다운로드
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
