'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const UserContext = createContext(null);

const defaultUserValue = {
  isAuthenticated: false,
  user: null,
  loading: false,
  userData: null,
  getToken: async () => null,
  refreshUserData: async () => {},
  setLevelIdentificationState: () => {},
  getCacheStatus: () => ({}),
};

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAuthenticated = Boolean(user);

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
