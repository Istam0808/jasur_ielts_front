"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Spinner from "@/components/common/spinner";
import ReadingPage from "@/app/mock/_components/ReadingPage";
import { getMockById } from "@/lib/mockApi";
import { adaptReadingMockToUi } from "@/lib/mockAdapters";
import { getMockAccessToken, setMockPayload } from "@/lib/mockSession";

export default function MockReadingByIdPage() {
  const params = useParams();
  const router = useRouter();
  const mockId = params?.id;
  const [readingExercise, setReadingExercise] = useState(null);
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
      try {
        const detail = await getMockById(mockId, token);
        setMockPayload(mockId, detail);
        setReadingExercise(adaptReadingMockToUi(detail));
      } catch (err) {
        setError(err?.message || "Не удалось загрузить reading mock.");
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

  if (error || !readingExercise) {
    return (
      <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", padding: "1rem" }}>
        <p>{error || "Не удалось открыть reading mock."}</p>
      </div>
    );
  }

  return (
    <ReadingPage
      readingExercise={readingExercise}
      difficulty="ielts"
      id={String(mockId)}
      nextHref={`/mock/${mockId}/writing`}
      uiVariant="mock-fullscreen-like"
      useUnifiedMockHeader={true}
    />
  );
}
