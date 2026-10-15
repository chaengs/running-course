import { Suspense } from "react";

type Health = { status: string; database: string; postgisVersion: string | null };

async function getHealth(): Promise<Health | null> {
  try {
    const response = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function ConnectionStatus() {
  const health = await getHealth();
  return (
    <main>
      <p className="eyebrow">RUNNING COURSE</p>
      <h1>새로운 길에서도,<br />내 페이스대로.</h1>
      <p className="intro">내 주변에서 원하는 거리만큼 달리고 출발점으로 돌아오는 코스를 준비하고 있어요.</p>
      <section aria-labelledby="status-title">
        <h2 id="status-title">개발 환경 연결 상태</h2>
        <dl>
          <div><dt>프론트엔드</dt><dd>Next.js 실행 중</dd></div>
          <div><dt>백엔드</dt><dd>{health?.status === "UP" ? "연결됨" : "연결 대기"}</dd></div>
          <div><dt>데이터베이스</dt><dd>{health?.database === "UP" ? `PostgreSQL · PostGIS ${health.postgisVersion ?? ""}` : "연결 대기"}</dd></div>
        </dl>
        {!health && <p className="hint">Docker DB와 Spring Boot를 실행한 뒤 페이지를 새로고침하세요.</p>}
      </section>
      <p className="hint">첫 구현 목표: 위치 선택 → 주변 코스 검색 → 코스 상세 확인</p>
    </main>
  );
}

export default function Home() {
  return <Suspense fallback={<main><p role="status">연결 상태를 확인하고 있어요…</p></main>}><ConnectionStatus /></Suspense>;
}
