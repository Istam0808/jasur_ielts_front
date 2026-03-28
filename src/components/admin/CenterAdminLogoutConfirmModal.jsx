"use client";

import { useEffect, useId } from "react";

/**
 * Подтверждение выхода center-admin: сначала POST logout, при ошибке сервера — «Выйти локально».
 * Стили: классы admin-dashboard__modal* (страница должна быть внутри .admin-dashboard с темой).
 */
export default function CenterAdminLogoutConfirmModal({
  isOpen,
  onRequestClose,
  onConfirmLogout,
  onLogoutLocal,
  error,
  isLoggingOut,
  title = "Выйти из аккаунта",
  description = "Вы уверены, что хотите выйти из аккаунта администратора?",
  confirmLabel = "Выйти",
  loggingLabel = "Выходим…",
  cancelLabel = "Отмена",
  localLogoutLabel = "Выйти локально",
  confirmAriaLabel = "Да, выйти из аккаунта",
  localLogoutAriaLabel = "Выйти локально без ответа сервера",
  cancelAriaLabel = "Отмена выхода",
}) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e) {
      if (e.key === "Escape") onRequestClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onRequestClose]);

  if (!isOpen) return null;

  const showLocalLogout = Boolean(error);

  return (
    <div
      className="admin-dashboard__modal-backdrop"
      onClick={onRequestClose}
      role="presentation"
    >
      <div
        className="admin-dashboard__modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="admin-dashboard__modal-title">
          {title}
        </h2>
        <p className="admin-dashboard__modal-text">{description}</p>
        {error ? (
          <p className="admin-login__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="admin-dashboard__modal-actions">
          <button
            type="button"
            className="admin-dashboard__btn-primary admin-dashboard__modal-confirm-btn"
            onClick={() => {
              void onConfirmLogout();
            }}
            aria-label={confirmAriaLabel}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? loggingLabel : confirmLabel}
          </button>
          {showLocalLogout ? (
            <button
              type="button"
              className="admin-dashboard__modal-close"
              onClick={onLogoutLocal}
              aria-label={localLogoutAriaLabel}
              disabled={isLoggingOut}
            >
              {localLogoutLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="admin-dashboard__modal-close"
            onClick={onRequestClose}
            aria-label={cancelAriaLabel}
            disabled={isLoggingOut}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
