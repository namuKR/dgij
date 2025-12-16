import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTestThumbnail(series?: string | null): string | null {
  if (!series) return null;
  const s = series.toLowerCase();

  // Order matters: specific matches first
  if (s.includes('서바이벌프로') || s.includes('survival pro')) return '/survivalpro.png';
  if (s.includes('서바이벌') || s.includes('survival')) return '/survival.png';
  if (s.includes('강대모의고사k') || s.includes('kangk')) return '/kangKmath.png';
  if (s.includes('강대모의고사x') || s.includes('kangx')) return '/kangXmath.png';
  if (s.includes('브릿지') || s.includes('bridge')) return '/bridge.png';

  return null;
}
