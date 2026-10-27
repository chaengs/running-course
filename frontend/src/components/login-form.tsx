"use client";
import uiStyles from "@/styles/ui.module.css";
import formStyles from "@/components/form.module.css";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type BackendStatus = "checking" | "ready" | "unavailable";
const HEALTH_CHECK_TIMEOUT_MS = 8_000;
const HEALTH_CHECK_MAX_WAIT_MS = 90_000;
const HEALTH_CHECK_INTERVAL_MS = 3_000;

export function LoginForm() {
    const [register, setRegister] = useState(false);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState("");
    const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
    const healthCheckRef = useRef<Promise<boolean> | null>(null);

    const waitForBackend = useCallback(() => {
        if (healthCheckRef.current) return healthCheckRef.current;

        const healthCheck = (async () => {
            setBackendStatus("checking");
            const startedAt = Date.now();

            while (Date.now() - startedAt < HEALTH_CHECK_MAX_WAIT_MS) {
                try {
                    const response = await fetch("/api/health", {
                        cache: "no-store",
                        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
                    });
                    if (response.ok) {
                        setBackendStatus("ready");
                        return true;
                    }
                } catch {
                    // Render may still be waking up. Retry the safe GET health check.
                }

                await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
            }

            setBackendStatus("unavailable");
            return false;
        })();

        healthCheckRef.current = healthCheck;
        void healthCheck.finally(() => {
            if (healthCheckRef.current === healthCheck) healthCheckRef.current = null;
        });
        return healthCheck;
    }, []);

    useEffect(() => {
        void waitForBackend();
    }, [waitForBackend]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending) return;

        const form = new FormData(event.currentTarget);
        const passwordCharacterCount = Array.from(String(form.get("password") ?? "")).length;
        if (register && (passwordCharacterCount < 10 || passwordCharacterCount > 15)) {
            setMessage("비밀번호는 10자 이상, 15자 이하로 입력하세요.");
            return;
        }

        setPending(true);
        setMessage("");
        try {
            const backendReady = await waitForBackend();
            if (!backendReady) {
                setMessage("서버가 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.");
                return;
            }

            const response = await fetch(`/api/session/${register ? "register" : "login"}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(form)),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            window.location.replace("/my/courses");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "다시 시도해 주세요.");
        } finally {
            setPending(false);
        }
    }

    return <form className={[uiStyles.courseInfo, formStyles.editorFields, formStyles.authForm, !register ? formStyles.loginMode : ""].join(" ")} onSubmit={handleSubmit}>
    <h2>{register ? "회원가입" : "로그인"}</h2>
    <fieldset className={formStyles.editorSaveFields} disabled={pending}>
      {register && <label>닉네임<input name="displayName" required maxLength={40} autoComplete="nickname"/></label>}
      <label>이메일<input type="email" name="email" required maxLength={254} autoComplete="email"/></label>
      <label>비밀번호<input type="password" name="password" required minLength={10} maxLength={register ? 30 : 72} onChange={(event) => { if (!register) return; const characters = Array.from(event.currentTarget.value); if (characters.length > 15) event.currentTarget.value = characters.slice(0, 15).join(""); }} autoComplete={register ? "new-password" : "current-password"}/></label>
      {register && <p className={formStyles.mapCaption}>비밀번호는 10자 이상, 15자 이하로 입력하세요.</p>}
      <button className={formStyles.buttonPrimary} type="submit">{pending ? "처리 중…" : register ? "가입하고 시작하기" : "로그인"}</button>
      <button className={uiStyles.backLink} type="button" onClick={() => { setRegister(!register); setMessage(""); }}>{register ? "기존 계정으로 로그인" : "처음이라면 회원가입"}</button>
    </fieldset>
    <p role="status" className={formStyles.editorMessage}>
      {backendStatus === "checking" && "잠시만 기다려 주세요."}
      {backendStatus === "unavailable" && <><span>서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요. </span><button type="button" onClick={() => { setMessage(""); void waitForBackend(); }}>다시 확인</button></>}
    </p>
    {message && <p role="alert" className={formStyles.editorMessage}>{message}</p>}
  </form>;
}
