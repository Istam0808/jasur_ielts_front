'use client';

import { BACKEND_URL } from './backend';

const CSRF_COOKIE_NAME = 'csrftoken';
const ACCOUNTS_PREFIX = '/accounts';

/**
 * Get CSRF token from document.cookie (Django default: csrftoken).
 * Must run in browser.
 */
export function getCsrfFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + CSRF_COOKIE_NAME + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Build application/x-www-form-urlencoded body from object.
 */
function buildFormBody(obj) {
  return new URLSearchParams(obj).toString();
}

/**
 * POST to accounts endpoint with CSRF and credentials.
 * @param {string} path - e.g. '/accounts/register/'
 * @param {Record<string, string>} formData - form fields (csrfmiddlewaretoken added here)
 * @returns {Promise<Response>}
 */
async function postAccountsForm(path, formData) {
  const csrf = getCsrfFromCookie();
  const body = {
    ...formData,
    ...(csrf ? { csrfmiddlewaretoken: csrf } : {}),
  };
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(csrf ? { 'X-CSRFToken': csrf } : {}),
    },
    body: buildFormBody(body),
  });
  return response;
}

/**
 * Register: POST /accounts/register/
 * @param {{ username: string, password1: string, password2: string, email: string, first_name: string, last_name: string }} data
 * @returns {Promise<{ ok: boolean, redirectUrl?: string, type?: 'redirect' | 'validation_error' | 'error', message?: string }>}
 */
export async function postRegister(data) {
  const response = await postAccountsForm(`${ACCOUNTS_PREFIX}/register/`, {
    username: data.username.trim(),
    password1: data.password1,
    password2: data.password2,
    email: data.email.trim(),
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
  });

  if (response.redirected && response.url) {
    return { ok: true, redirectUrl: response.url, type: 'redirect' };
  }

  if (response.status === 302) {
    const location = response.headers.get('Location');
    if (location) return { ok: true, redirectUrl: location, type: 'redirect' };
  }

  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      type: 'error',
      message: response.statusText || 'Registration failed',
      status: response.status,
      body: text,
    };
  }

  return {
    ok: false,
    type: 'validation_error',
    message: 'Please check the form fields and try again.',
    status: response.status,
  };
}

/**
 * Login: POST /accounts/login/
 * @param {{ username: string, password: string }} data
 * @returns {Promise<{ ok: boolean, redirectUrl?: string, type?: 'redirect' | 'error', message?: string }>}
 */
export async function postLogin(data) {
  const response = await postAccountsForm(`${ACCOUNTS_PREFIX}/login/`, {
    username: data.username.trim(),
    password: data.password,
  });

  if (response.redirected && response.url) {
    return { ok: true, redirectUrl: response.url, type: 'redirect' };
  }

  if (response.status === 302) {
    const location = response.headers.get('Location');
    if (location) return { ok: true, redirectUrl: location, type: 'redirect' };
  }

  if (!response.ok) {
    return {
      ok: false,
      type: 'error',
      message: 'Invalid login or password',
      status: response.status,
    };
  }

  return {
    ok: false,
    type: 'error',
    message: 'Invalid login or password',
  };
}

/**
 * Logout: POST /accounts/logout/
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function postLogout() {
  const response = await postAccountsForm(`${ACCOUNTS_PREFIX}/logout/`, {});
  if (response.ok || response.status === 302) {
    return { ok: true };
  }
  return { ok: false, message: response.statusText };
}

/**
 * Check session / get current user: GET /accounts/profile/
 * Expects JSON from backend: { id, username, email, first_name, last_name, ... } or HTML.
 * @returns {Promise<{ ok: boolean, user?: object | null }>}
 */
export async function getProfile() {
  const csrf = getCsrfFromCookie();
  const response = await fetch(`${BACKEND_URL}${ACCOUNTS_PREFIX}/profile/`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(csrf ? { 'X-CSRFToken': csrf } : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return { ok: true, user: null };
    }
    return { ok: false, user: null };
  }

  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    return { ok: true, user: data };
  }

  return { ok: true, user: null };
}
