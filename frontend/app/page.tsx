'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  // Wait for Zustand persist to rehydrate from localStorage before redirecting
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!token) {
      router.replace('/login');
      return;
    }

    // Verify token hasn't expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (Date.now() / 1000 >= payload.exp) {
        router.replace('/login');
        return;
      }
    } catch {
      router.replace('/login');
      return;
    }

    router.replace(role === 'student' ? '/learn' : '/students');
  }, [mounted, token, role, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">Loading...</p>
    </div>
  );
}
