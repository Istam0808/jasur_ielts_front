"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Spinner from "@/components/common/spinner";
import TestListeningPage from "@/app/mock/_components/TestListeningPage";
import { getMockById } from "@/lib/mockApi";
import { adaptListeningMockToUi } from "@/lib/mockAdapters";
import { getMockAccessToken, getMockPayload, setMockPayload } from "@/lib/mockSession";

export default function MockListeningByIdPage() {
  const params = useParams();
  const router = useRouter();
  const mockId = params?.id;
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mockId) return;
    const token = getMockAccessToken();

    if (!token) {
      router.replace("/");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      const cached = getMockPayload(mockId);
      if (cached) {
        setPayload(adaptListeningMockToUi(cached));
        setLoading(false);
        return;
      }
      try {
        const detail = await getMockById(mockId, token);
        setMockPayload(mockId, detail);
        setPayload(adaptListeningMockToUi(detail));
      } catch (err) {
        setError(err?.message || "Не удалось загрузить listening mock.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mockId, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "55vh", display: "grid", placeItems: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", padding: "1rem" }}>
        <p>{error || "Не удалось запустить mock."}</p>
      </div>
    );
  }

  return (
    <TestListeningPage
      bookData={payload.bookData}
      answersData={payload.answersData}
      bookId={payload.bookId}
      testId={payload.testId}
      testTitle={payload.testTitle}
      nextHref={`/mock/${mockId}/reading`}
      isMockExam={true}
      useUnifiedMockHeader={true}
    />
  );
}
