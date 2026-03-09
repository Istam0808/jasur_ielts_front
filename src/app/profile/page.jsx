"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useUser } from "@/contexts/UserContext";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import "./profile.scss";

function ProfileContent() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { user, logout } = useUser();

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const displayName =
    user &&
    [user.first_name, user.last_name].filter(Boolean).join(" ");
  const fallbackName = user?.username || user?.email || "";

  return (
    <div className="profile-page">
      <div className="profile-page__card">
        <h1 className="profile-page__title">
          {t("auth:profile.title", "Profile")}
        </h1>

        <div className="profile-page__section">
          <dl className="profile-page__dl">
            {(displayName || fallbackName) && (
              <>
                <dt className="profile-page__dt">
                  {t("auth:profile.displayName", "Name")}
                </dt>
                <dd className="profile-page__dd">
                  {displayName || fallbackName}
                </dd>
              </>
            )}
            {user?.username && (
              <>
                <dt className="profile-page__dt">
                  {t("auth:profile.username", "Username")}
                </dt>
                <dd className="profile-page__dd">{user.username}</dd>
              </>
            )}
            {user?.email && (
              <>
                <dt className="profile-page__dt">
                  {t("auth:profile.email", "Email")}
                </dt>
                <dd className="profile-page__dd">{user.email}</dd>
              </>
            )}
          </dl>
        </div>

        <button
          type="button"
          className="profile-page__logout"
          onClick={handleLogout}
          aria-label={t("auth:profile.logout", "Sign out")}
        >
          {t("auth:profile.logout", "Sign out")}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
