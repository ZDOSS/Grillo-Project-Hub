import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProjectStore } from "../../store/project-store";
import { searchProject, type SearchHit } from "@gph/core";

/**
 * Search view. Local full-text search across items, docs, comments, and labels with filters.
 */
export function SearchView() {
  const bundle = useProjectStore((s) => s.bundle);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [scope, setScope] = useState<Array<"items" | "docs" | "comments" | "labels">>(() => {
    const s = params.get("scope");
    if (s) return s.split(",") as Array<"items" | "docs" | "comments" | "labels">;
    return ["items", "docs", "comments", "labels"];
  });

  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (scope.length < 4) next.set("scope", scope.join(","));
    setParams(next, { replace: true });
  }, [q, scope, setParams]);

  const hits: SearchHit[] = useMemo(() => {
    if (!bundle) return [];
    return searchProject(bundle, q, { scope });
  }, [bundle, q, scope]);

  if (!bundle) return null;
  return (
    <div className="col" style={{ padding: 16, gap: 12, flex: 1 }}>
      <h2>Search</h2>
      <div className="row" style={{ gap: 8 }}>
        <input className="input" placeholder="Search across items, docs, comments, labels…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus style={{ flex: 1 }} />
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {(["items", "docs", "comments", "labels"] as const).map((s) => (
          <label key={s} className="row" style={{ gap: 4, textTransform: "capitalize" }}>
            <input type="checkbox" checked={scope.includes(s)} onChange={() => {
              setScope((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
            }} />
            {s}
          </label>
        ))}
      </div>
      {hits.length === 0 && q && <div className="empty"><div className="empty-title">No results</div><div>Try a different query or scope.</div></div>}
      <div className="col" style={{ gap: 6 }}>
        {hits.map((h) => (
          <Link key={`${h.type}-${h.id}`} to={
            h.type === "item" ? `/item/${h.id}` :
            h.type === "doc" ? `/doc/${h.id}` :
            h.type === "comment" && "itemId" in h ? `/item/${h.itemId}` : "/search"
          } className="board-card" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="tag tag-info">{h.type}</span>
              <strong>{h.title}</strong>
            </div>
            {h.type !== "label" && h.snippet && <div className="text-xs text-muted">{h.snippet}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
