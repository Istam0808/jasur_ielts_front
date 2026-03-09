'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getProfile, postLogout as apiLogout } from '@/lib/accountsApi';

const UserContext = createContext(null);

const defaultUserValue = {
  isAuthenticated: false,
  user: null,
  loading: false,
  userData: null,
  getToken: async () => null,
  refreshUserData: async () => {},
  refreshUser: async () => {},
  logout: async () => {},
  setLevelIdentificationState: () => {},
  getCacheStatus: () => ({}),
};

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = Boolean(user);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const { ok, user: profileUser } = await getProfile();
      setUser(ok && profileUser ? profileUser : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }, []);

  const getToken = useCallback(async () => {
    return null;
  }, []);

  const refreshUserData = useCallback(async () => {
    setUserData((prev) => prev);
  }, []);

  const setLevelIdentificationState = useCallback(() => {}, []);

  const getCacheStatus = useCallback(() => ({}), []);

  const value = {
    isAuthenticated,
    user,
    loading,
    userData,
    getToken,
    refreshUserData,
    refreshUser,
    logout,
    setLevelIdentificationState,
    getCacheStatus,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (ctx == null) {
    return defaultUserValue;
  }
  return ctx;
}
