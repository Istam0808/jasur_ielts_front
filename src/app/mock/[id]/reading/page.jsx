"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Spinner from "@/components/common/spinner";
import Modal from "@/components/common/Modal";
import ReadingPage from "@/app/mock/_components/ReadingPage";
import { getMockById, isTokenExpiredError, logoutAgent } from "@/lib/mockApi";
import { adaptReadingMockToUi } from "@/lib/mockAdapters";
import {
  clearMockSession,
  getMockAccessToken,
  getMockSession,
  setMockPayload,
} from "@/lib/mockSession";
import MockPreloadScreen from "@/components/MockPreloadScreen";
import { useMockPreloader } from "@/hooks/useMockPreloader";

export default function MockReadingByIdPage() {
  const params = useParams();
  const router = useRouter();
  const mockId = params?.id;
  const [mockDetail, setMockDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
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

  const readingExercise = useMemo(() => {
    if (!cachedData) return null;
    return adaptReadingMockToUi(cachedData);
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
        if (isTokenExpiredError(err)) {
          setShowTokenExpiredModal(true);
          return;
        }
        setError(err?.message || "Не удалось загрузить reading mock.");
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

  const handleFinishSession = async () => {
    const token = getMockSession()?.accessToken;
    try {
      if (token) {
        await logoutAgent(token);
      }
    } catch (err) {
      console.warn("Logout request failed after token expiration:", err);
    } finally {
      clearMockSession();
      setShowTokenExpiredModal(false);
      router.replace("/");
    }
  };

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
        <p>{error || "Не удалось открыть reading mock."}</p>
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

  if (!readingExercise) {
    return (
      <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", padding: "1rem" }}>
        <p>Не удалось подготовить reading mock.</p>
      </div>
    );
  }

  return (
    <>
      <ReadingPage
        readingExercise={readingExercise}
        difficulty="ielts"
        id={String(mockId)}
        nextHref={`/mock/${mockId}/writing`}
        uiVariant="mock-fullscreen-like"
        useUnifiedMockHeader={true}
      />

      {showTokenExpiredModal && (
        <Modal
          onClose={() => {}}
          title="Сессия истекла"
          description="Ваш токен авторизации истек. Чтобы продолжить работу, завершите текущую сессию и войдите снова."
          closeOnClickOutside={false}
          closeOnEscape={false}
          showCloseButton={false}
          buttons={[
            {
              text: "Закончить сессию",
              className: "btn btn-primary",
              onClick: handleFinishSession,
            },
          ]}
        />
      )}
    </>
  );
}
