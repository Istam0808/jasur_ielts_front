"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Spinner from "@/components/common/spinner";
import WritingPage from "@/app/mock/_components/WritingPage";
import { getMockById } from "@/lib/mockApi";
import { adaptWritingMockToUi } from "@/lib/mockAdapters";
import { getMockAccessToken, setMockPayload } from "@/lib/mockSession";
import MockPreloadScreen from "@/components/MockPreloadScreen";
import { useMockPreloader } from "@/hooks/useMockPreloader";

export default function MockWritingByIdPage() {
  const params = useParams();
  const router = useRouter();
  const mockId = params?.id;
  const [mockDetail, setMockDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const {
    percent,
    status,
    errors,
    cachedData,
    bytesLoaded,
    bytesTotal,
    currentLabel,
    filesDone,
    filesTotal,
    swPrefetchDone,
    swPrefetchTotal,
  } = useMockPreloader(mockDetail, {
    includeStaticInstructions: true,
  });

  const writingExercise = useMemo(() => {
    if (!cachedData) return null;
    return adaptWritingMockToUi(cachedData);
  }, [cachedData]);

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
        setMockDetail(detail);
      } catch (err) {
        setError(err?.message || "Не удалось загрузить writing mock.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mockId, router]);

  useEffect(() => {
    if (status === "done" && errors.length > 0) {
      console.warn("[mock-preloader] some assets failed to preload:", errors);
    }
  }, [errors, status]);

  if (loading && !mockDetail) {
    return (
      <div style={{ minHeight: "55vh", display: "grid", placeItems: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (error || !mockDetail) {
    return (
      <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", padding: "1rem" }}>
        <p>{error || "Не удалось открыть writing mock."}</p>
      </div>
    );
  }

  if (status !== "done") {
    return (
      <MockPreloadScreen
        percent={percent}
        status={status}
        bytesLoaded={bytesLoaded}
        bytesTotal={bytesTotal}
        currentLabel={currentLabel}
        filesDone={filesDone}
        filesTotal={filesTotal}
        swPrefetchDone={swPrefetchDone}
        swPrefetchTotal={swPrefetchTotal}
      />
    );
  }

  if (!writingExercise) {
    return (
      <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", padding: "1rem" }}>
        <p>Не удалось подготовить writing mock.</p>
      </div>
    );
  }

  return (
    <WritingPage
      writingExercise={writingExercise}
      difficulty="ielts"
      id={String(mockId)}
      startScreenVariant="ieltsAcademic"
      useUnifiedMockHeader={true}
    />
  );
}
