export type Role = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  password?: string; // Simple password for now
}

export interface Score {
  testId: string;
  subject: '수학' | '국어' | '영어' | '한국사' | '탐구';
  score: number;
  date: string;
  answers?: Record<number, number>; // Stored OMR answers
  selection?: string; // e.g. '미적분', '화법과 작문'
}

export interface MockTest {
  id: string;
  subject: '수학' | '국어' | '영어' | '한국사' | '탐구';
  publisher: string;
  year: number;
  series: string;
  season?: string;
  number?: string;
  fullName: string;
  // File and objects would be URLs or refs in real app
  examFileUrl?: string;
  answerKeyImgUrl?: string;
  explanationFileUrl?: string;
  listeningAudioUrl?: string;
  answerKey: Record<number, number>;
  scanType?: 'Original' | 'OCR' | 'Scan';
}

export interface WeeklyScheduleItem {
  day: '월' | '화' | '수' | '목' | '금' | '토' | '일';
  tests: string[]; // List of MockTest full names
}

export const USERS: User[] = [
  { id: '1', name: '김학생', role: 'student', password: '123' },
  { id: '2', name: '이선생', role: 'teacher' },
  { id: '3', name: '관리자', role: 'admin', password: 'admin' },
];

export const R2_PUBLIC_URL = "https://pub-c45c0bdedae9472188e6d86b016bf763.r2.dev";

export const MOCK_TESTS: MockTest[] = [
  {
    id: 't1',
    subject: '수학',
    publisher: '시대인재',
    year: 2027,
    series: '서바이벌',
    season: '1',
    number: '1',
    fullName: '2027 시대인재 서바이벌 수학 1회',
    answerKey: { 1: 2, 2: 3, 3: 5 },
    scanType: 'Original',
    examFileUrl: `${R2_PUBLIC_URL}/2027_math_survival_1_exam.pdf`, // Placeholder using Base URL
    answerKeyImgUrl: `${R2_PUBLIC_URL}/2027_math_survival_1_answer.png`
  },
  {
    id: 't2',
    subject: '국어',
    publisher: '시대인재',
    year: 2027,
    series: '서바이벌',
    season: '1',
    number: '1',
    fullName: '2027 시대인재 서바이벌 국어 1회',
    answerKey: { 1: 1, 2: 4, 3: 2 },
    scanType: 'Scan'
  },
  {
    id: 'test-1765454086321',
    subject: '수학',
    publisher: '시대인재',
    year: 2026,
    series: '서바이벌',
    season: '',
    number: '4', // Simplified from 4회
    fullName: '2026 시대인재 전국 서바이벌 4회',
    scanType: 'Original',
    examFileUrl: `${R2_PUBLIC_URL}/1765454084519-서바_전국_수학_4회+답.pdf`,
    answerKey: {
      1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1,
      11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1,
      21: 1, 22: 1, 23: 1, 24: 1, 25: 1, 26: 1, 27: 1, 28: 1, 29: 1, 30: 1,
      // Mapping typical mis-keys 122->22 if needed, but assuming user provided valid keys for demo 
      // Logic might need cleanup if keys > 30 for math are provided (common/select)
      // User provided 122..130, possibly selection keys shifted? 
      // I will include them raw.
      122: 1, 123: 1, 124: 1, 125: 1, 126: 1, 127: 1, 128: 1, 129: 1, 130: 1
    }
  }
];

export const SCORES: Record<string, Score[]> = {
  '1': [ // Student A scores
    { testId: 't1', subject: '수학', score: 88, date: '2025-11-01' },
    { testId: 't2', subject: '국어', score: 92, date: '2025-11-02' },
    { testId: 't1', subject: '수학', score: 90, date: '2025-11-08' }, // Improved
  ]
};

export const WEEKLY_SCHEDULE: WeeklyScheduleItem[] = [
  { day: '월', tests: ['2027 시대인재 서바이벌 수학 1회'] },
  { day: '화', tests: ['2027 시대인재 서바이벌 국어 1회'] },
  { day: '수', tests: [] },
  { day: '목', tests: [] },
  { day: '금', tests: [] },
  { day: '토', tests: [] },
  { day: '일', tests: [] },
];

export const ACADEMY_AVERAGE_SCORES = [
  { week: '1주', myScore: 88, avgScore: 82 },
  { week: '2주', myScore: 90, avgScore: 84 },
  { week: '3주', myScore: 85, avgScore: 80 },
  { week: '4주', myScore: 92, avgScore: 85 },
  { week: '5주', myScore: 94, avgScore: 88 },
];

export const SELECTION_CONFIG: Record<string, { common: number[], select: number[], options: string[] }> = {
  '국어': {
    common: Array.from({ length: 34 }, (_, i) => i + 1), // 1-34
    select: Array.from({ length: 11 }, (_, i) => i + 35), // 35-45
    options: ['화법과 작문', '언어와 매체']
  },
  '수학': {
    common: Array.from({ length: 22 }, (_, i) => i + 1), // 1-22
    select: Array.from({ length: 8 }, (_, i) => i + 23), // 23-30
    options: ['확률과 통계', '미적분']
  }
};
