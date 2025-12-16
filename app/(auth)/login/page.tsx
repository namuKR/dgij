'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const { login } = useAuth();
    const [studentName, setStudentName] = useState('');
    const [studentPass, setStudentPass] = useState('');

    const [teacherName, setTeacherName] = useState('');

    const [adminPass, setAdminPass] = useState('');

    const handleLogin = (role: 'student' | 'teacher' | 'admin') => {
        let success = false;
        if (role === 'student') success = login(studentName, studentPass, 'student');
        else if (role === 'teacher') success = login(teacherName, undefined, 'teacher');
        else if (role === 'admin') success = login('관리자', adminPass, 'admin');

        if (!success) alert('로그인 정보가 올바르지 않습니다. (예: 김학생 / 123)');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
            <Card className="w-full max-w-md shadow-lg border-primary/10">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
                    </div>
                    <CardTitle className="text-2xl font-bold text-primary">도개인재 ME</CardTitle>
                    <CardDescription>반갑습니다. 계정에 로그인해주세요.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="student" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="student">학생</TabsTrigger>
                            <TabsTrigger value="teacher">선생님</TabsTrigger>
                            <TabsTrigger value="admin">관리자</TabsTrigger>
                        </TabsList>

                        <TabsContent value="student">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="s-name">학생 이름</Label>
                                    <Input
                                        id="s-name"
                                        placeholder="홍길동"
                                        value={studentName}
                                        onChange={e => setStudentName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="s-pass">비밀번호</Label>
                                    <Input
                                        id="s-pass"
                                        type="password"
                                        placeholder="비밀번호 입력"
                                        value={studentPass}
                                        onChange={e => setStudentPass(e.target.value)}
                                    />
                                </div>
                                <Button className="w-full font-semibold" onClick={() => handleLogin('student')}>
                                    로그인
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="teacher">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="t-name">이름</Label>
                                    <Input
                                        id="t-name"
                                        placeholder="홍길동"
                                        value={teacherName}
                                        onChange={e => setTeacherName(e.target.value)}
                                    />
                                </div>
                                <Button className="w-full font-semibold" onClick={() => handleLogin('teacher')}>
                                    로그인
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="admin">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="a-pass">관리자 비밀번호</Label>
                                    <Input
                                        id="a-pass"
                                        type="password"
                                        placeholder="관리자 비밀번호 입력"
                                        value={adminPass}
                                        onChange={e => setAdminPass(e.target.value)}
                                    />
                                </div>
                                <Button className="w-full font-semibold" onClick={() => handleLogin('admin')}>
                                    대시보드 접속
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
