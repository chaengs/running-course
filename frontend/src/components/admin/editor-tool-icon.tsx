type Tool = "undo" | "delete" | "loop" | "reset" | "location";

const paths: Record<Tool, string> = {
  undo: "M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12",
  delete: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  loop: "M12 12c-3-5-4-5-6-5a5 5 0 0 0 0 10c2 0 3-1 6-5s4-5 6-5a5 5 0 0 1 0 10c-2 0-3-1-6-5Z",
  reset: "M4 4v6h6M4 10a8 8 0 1 1 1 8",
  location: "M12 2v3M12 19v3M2 12h3M19 12h3M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
};

export function EditorToolIcon({ tool }: { tool: Tool }) {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[tool]} /></svg>;
}
