'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import LoadingSpinner from './LoadingSpinner';

export default function AuthGuard({ children, fallback = null }) {
  const { isAuthenticated, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated and not loading, redirect to home
    if (isAuthenticated && !loading) {
      router.replace('/');
    }
  }, [isAuthenticated, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    return fallback || (
      <div className="auth-guard-loading">
        <LoadingSpinner variant="large" />
      </div>
    );
  }

  // If authenticated, don't render children (will redirect)
  if (isAuthenticated) {
    return null;
  }

  // If not authenticated, render children
  return children;
}
