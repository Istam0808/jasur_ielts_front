"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Spinner from "@/components/common/spinner";
import WritingPage from "@/app/mock/_components/WritingPage";
import { getMockById } from "@/lib/mockApi";
import { adaptWritingMockToUi } from "@/lib/mockAdapters";
import { getMockAccessToken, getMockPayload, setMockPayload } from "@/lib/mockSession";

export default function MockWritingByIdPage() {
  const params = useParams();
  const router = useRouter();
  const mockId = params?.id;
  const [writingExercise, setWritingExercise] = useState(null);
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
        setWritingExercise(adaptWritingMockToUi(cached));
        setLoading(false);
        return;
      }
      try {
        const detail = await getMockById(mockId, token);
        setMockPayload(mockId, detail);
        setWritingExercise(adaptWritingMockToUi(detail));
      } catch (err) {
        setError(err?.message || "Не удалось загрузить writing mock.");
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

  if (error || !writingExercise) {
    return (
      <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", padding: "1rem" }}>
        <p>{error || "Не удалось открыть writing mock."}</p>
      </div>
    );
  }

  return (
    <WritingPage
      writingExercise={writingExercise}
      difficulty="ielts"
      id={String(mockId)}
      startScreenVariant="ieltsAcademic"
    />
  );
}
