"use client";
import uiStyles from "@/styles/ui.module.css";
import formStyles from "@/components/form.module.css";
import { useState } from "react";
export function LoginForm() {
    const [register, setRegister] = useState(false);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState("");
    return <form className={[uiStyles.courseInfo, formStyles.editorFields, formStyles.authForm, !register ? formStyles.loginMode : ""].join(" ")} onSubmit={async (event) => {
            event.preventDefault();
            if (pending)
                return;
            const form = new FormData(event.currentTarget);
            const passwordCharacterCount = Array.from(String(form.get("password") ?? "")).length;
            if (register && (passwordCharacterCount < 10 || passwordCharacterCount > 15)) {
                setMessage("비밀번호는 10자 이상, 15자 이하로 입력하세요.");
                return;
            }
            setPending(true);
            setMessage("");
            try {
                const response = await fetch(`/api/session/${register ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
                const result = await response.json();
                if (!response.ok)
                    throw new Error(result.message);
                window.location.replace("/my/courses");
            }
            catch (error) {
                setMessage(error instanceof Error ? error.message : "다시 시도해 주세요.");
                setPending(false);
            }
        }}>
    <h2>{register ? "회원가입" : "로그인"}</h2>
    <fieldset className={formStyles.editorSaveFields} disabled={pending}>
      {register && <label>닉네임<input name="displayName" required maxLength={40} autoComplete="nickname"/></label>}
      <label>이메일<input type="email" name="email" required maxLength={254} autoComplete="email"/></label>
      <label>비밀번호<input type="password" name="password" required minLength={10} maxLength={register ? 30 : 72} onChange={(event) => { if (!register) return; const characters = Array.from(event.currentTarget.value); if (characters.length > 15) event.currentTarget.value = characters.slice(0, 15).join(""); }} autoComplete={register ? "new-password" : "current-password"}/></label>
      {register && <p className={formStyles.mapCaption}>비밀번호는 10자 이상, 15자 이하로 입력하세요.</p>}
      <button className={formStyles.buttonPrimary} type="submit">{pending ? "처리 중…" : register ? "가입하고 시작하기" : "로그인"}</button>
      <button className={uiStyles.backLink} type="button" onClick={() => { setRegister(!register); setMessage(""); }}>{register ? "기존 계정으로 로그인" : "처음이라면 회원가입"}</button>
    </fieldset>
    <p role="alert" className={formStyles.editorMessage}>{message}</p>
  </form>;
}
