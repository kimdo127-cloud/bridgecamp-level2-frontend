"use client";

import { useEffect, useState } from "react";
import type { User } from "./types";

// 로그인 토큰과 계정 정보는 이 브라우저에만 저장한다. 권한은 매 요청마다 백엔드가 다시 확인한다.
const TOKEN_KEY = "bridgecamp:token";
const USER_KEY = "bridgecamp:user";
const EVENT = "bridgecamp:auth";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveLogin(token: string, user: User) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function logout() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

// 로그인 상태. 처음 그릴 때는 서버와 같게 "확인 중"으로 두고, 브라우저 저장소를 읽은 뒤 바뀐다
export function useAuth() {
  const [state, setState] = useState<{ ready: boolean; user: User | null }>({ ready: false, user: null });
  useEffect(() => {
    const sync = () => setState({ ready: true, user: getToken() ? getUser() : null });
    const t = setTimeout(sync, 0);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}

// 로그인 뒤 돌아갈 주소. 다른 사이트로 보내지 않도록 우리 사이트 안의 경로만 허용한다
export function safeNext(next: string | null, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
