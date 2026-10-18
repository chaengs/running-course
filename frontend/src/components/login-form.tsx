"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return <form className="course-info editor-fields auth-form" onSubmit={async (event) => {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/session/${register ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      router.replace("/my/courses"); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "다시 시도해 주세요."); setPending(false); }
  }}>
    <h2>{register ? "회원가입" : "로그인"}</h2>
    <fieldset className="editor-save-fields" disabled={pending}>
      {register && <label>닉네임<input name="displayName" required maxLength={40} autoComplete="nickname" /></label>}
      <label>이메일<input type="email" name="email" required maxLength={254} autoComplete="email" /></label>
      <label>비밀번호<input type="password" name="password" required minLength={10} maxLength={72} autoComplete={register ? "new-password" : "current-password"} /></label>
      <p className="map-caption">비밀번호는 10자 이상, UTF-8 기준 72바이트 이하로 입력하세요.</p>
      <button className="button-primary" type="submit">{pending ? "처리 중…" : register ? "가입하고 시작하기" : "로그인"}</button>
      <button className="back-link" type="button" onClick={() => { setRegister(!register); setMessage(""); }}>{register ? "기존 계정으로 로그인" : "처음이라면 회원가입"}</button>
    </fieldset>
    <p role="alert" className="editor-message">{message}</p>
  </form>;
}
