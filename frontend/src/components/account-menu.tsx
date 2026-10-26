"use client";
import { useState } from "react";
export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return <><button type="button" disabled={pending} onClick={async () => {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/session/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.replace("/");
    } catch { setMessage("로그아웃하지 못했어요."); } finally { setPending(false); }
  }}>{pending ? "처리 중" : "로그아웃"}</button><span role="status">{message}</span></>;
}
