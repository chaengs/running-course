"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function CourseOwnerActions({ id, published }: { id: number; published: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  async function mutate(remove: boolean) {
    if (locked.current) return;
    locked.current = true; setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/courses/${id}${remove ? "" : "/visibility"}`, {
        method: remove ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" },
        body: remove ? undefined : JSON.stringify({ published: !published }),
      });
      if (!response.ok) throw new Error((await response.json()).message);
      if (remove) router.replace("/my/courses");
      else setMessage(published ? "비공개로 변경했어요. 공유 URL로 다른 사람이 볼 수 없어요." : "공개했어요. URL로 코스를 공유할 수 있어요.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "다시 시도해 주세요."); }
    finally { locked.current = false; setPending(false); }
  }
  return <section className="owner-actions" aria-label="내 코스 관리">
    <span className="type-badge">{published ? "공개 코스" : "비공개 · 나만 보기"}</span>
    <Link className="back-link" href={`/courses/${id}/edit`}>코스 수정</Link>
    {!published && <p className="map-caption">공개하면 누구나 경로를 볼 수 있어요. 집 등 개인 위치가 포함됐는지 확인하세요.</p>}
    <button type="button" disabled={pending} onClick={() => mutate(false)}>{published ? "비공개로 변경" : "공개하기"}</button>
    <button type="button" disabled={pending} onClick={() => setConfirmDelete(!confirmDelete)}>삭제</button>
    {confirmDelete && <div role="alert"><p>이 코스를 영구 삭제할까요?</p><button type="button" disabled={pending} onClick={() => mutate(true)}>삭제 확인</button><button type="button" disabled={pending} onClick={() => setConfirmDelete(false)}>취소</button></div>}
    <p role="status">{message}</p>
  </section>;
}

export function ShareCourseButton() {
  const [message, setMessage] = useState("");
  return <><button type="button" className="share-button" onClick={async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}`); setMessage("공개 코스 URL을 복사했어요."); }
    catch { setMessage("주소창의 URL을 복사해 주세요."); }
  }}>공유 URL 복사</button><p className="map-caption" role="status">{message}</p></>;
}
