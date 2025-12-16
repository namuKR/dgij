'use client';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    if (!user) return null;

    return (
        <div className="p-4 space-y-6 max-w-md mx-auto pt-10">
            <h1 className="text-2xl font-bold">내 정보</h1>

            <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-24 h-24">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h2 className="text-xl font-bold">{user.name}</h2>
                    <p className="text-muted-foreground capitalize">{user.role === 'student' ? '학생' : user.role === 'teacher' ? '강사' : '관리자'}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">계정 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">ID</span>
                        <span>{user.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">가입일</span>
                        <span>2025년 11월</span>
                    </div>
                </CardContent>
            </Card>

            {user.role === 'admin' && (
                <Button className="w-full" variant="outline" onClick={() => router.push('/admin/upload')}>
                    관리자 업로드 페이지 이동
                </Button>
            )}

            <Button variant="destructive" className="w-full" onClick={logout}>로그아웃</Button>
        </div>
    )
}
