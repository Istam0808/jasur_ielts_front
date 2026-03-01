import { useEffect, useMemo, useState } from "react";

const resolveTest = (bookData, testId) => {
  if (!bookData || !testId) return null;
  if (Array.isArray(bookData)) {
    return bookData.find((test) => test.id === testId) || null;
  }
  return bookData.tests?.find((test) => test.id === testId) || null;
};

export const useTestData = (bookData, bookId, testId) => {
  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const resolvedId = useMemo(() => {
    const parsed = Number(testId);
    return Number.isNaN(parsed) ? null : parsed;
  }, [testId]);

  useEffect(() => {
    setIsLoading(true);
    const resolvedTest = resolveTest(bookData, resolvedId);
    setTest(resolvedTest);
    setIsLoading(false);
  }, [bookData, bookId, resolvedId]);

  return { test, isLoading };
};
