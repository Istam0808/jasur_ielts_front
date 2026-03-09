'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, fallback = null, redirectTo = '/' }) {
  const { isAuthenticated, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If user is not authenticated and not loading, redirect to login
    if (!isAuthenticated && !loading) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, loading, router, redirectTo]);

  // Show loading while checking authentication
  if (loading) {
    return fallback || (
      <div className="protected-route-loading">
        <LoadingSpinner variant="large" />
      </div>
    );
  }

  // If not authenticated, don't render children (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // If authenticated, render children
  return children;
}
