"use client";
import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import { useTransition } from "react";
export default function Error({ retry }: {
    error: Error & {
        digest?: string;
    };
    retry: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    return (<main id="main-content" className={layoutStyles.errorPage}>
      <section className={uiStyles.emptyState} role="alert" aria-labelledby="error-title">
        <span className={uiStyles.stateSymbol} aria-hidden="true">!</span>
        <h1 id="error-title">코스를 불러오지 못했어요</h1>
        <p>잠시 후 다시 시도해 주세요.</p>
        <button className={uiStyles.buttonPrimary} disabled={isPending} onClick={() => startTransition(() => retry())}>{isPending ? "다시 불러오는 중…" : "다시 시도"}</button>
      </section>
    </main>);
}
