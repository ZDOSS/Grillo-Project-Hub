import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchProject, type SearchHit } from "@gph/core";
import {
  CheckboxField,
  EmptyState,
  MetadataBadge,
  PageHeader,
  TextField
} from "../../components";
import { useProjectStore } from "../../store/project-store";

type Scope = "items" | "docs" | "comments" | "labels";

const SCOPES: Scope[] = ["items", "docs", "comments", "labels"];

const GROUPS: Array<{ label: string; match: SearchHit["type"] }> = [
  { label: "Items", match: "item" },
  { label: "Docs", match: "doc" },
  { label: "Comments", match: "comment" },
  { label: "Labels", match: "label" }
];

/**
 * Search view. Local full-text search across items, docs, comments, and labels with filters.
 */
export function SearchView() {
  const bundle = useProjectStore((s) => s.bundle);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [scope, setScope] = useState<Scope[]>(() => {
    const s = params.get("scope");
    if (s) return s.split(",") as Scope[];
    return SCOPES;
  });

  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (scope.length < SCOPES.length) next.set("scope", scope.join(","));
    setParams(next, { replace: true });
  }, [q, scope, setParams]);

  const hits: SearchHit[] = useMemo(() => {
    if (!bundle) return [];
    return searchProject(bundle, q, { scope });
  }, [bundle, q, scope]);

  if (!bundle) return null;

  const toggleScope = (value: Scope) => {
    setScope((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]
    );
  };

  return (
    <div className="search-view">
      <PageHeader
        title="Search"
        description="Search items, docs, comments, and labels in the open project."
      />
      <div className="search-view-body">
        <TextField
          label="Search"
          placeholder="Search across items, docs, comments, labels"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          autoFocus
        />
        <div className="search-scope-controls">
          {SCOPES.map((value) => (
            <CheckboxField
              key={value}
              label={value}
              checked={scope.includes(value)}
              onChange={() => toggleScope(value)}
            />
          ))}
        </div>
        {!q ? (
          <EmptyState
            title="Start with a query"
            description="Results are grouped by project surface once you begin typing."
          />
        ) : null}
        {q && hits.length === 0 ? (
          <EmptyState
            title="No results"
            description="Try a different query or search scope."
          />
        ) : null}
        {GROUPS.map((group) => {
          const groupHits = hits.filter((hit) => hit.type === group.match);
          if (groupHits.length === 0) return null;
          return (
            <section key={group.match} className="search-result-group">
              <h2>{group.label}</h2>
              <div className="col" style={{ gap: 6 }}>
                {groupHits.map((hit) => (
                  <Link
                    key={`${hit.type}-${hit.id}`}
                    to={routeForHit(hit)}
                    className="board-card search-result-card"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="row" style={{ gap: 6 }}>
                      <MetadataBadge tone="info">{hit.type}</MetadataBadge>
                      <strong>{hit.title}</strong>
                    </div>
                    {hit.type !== "label" && hit.snippet ? (
                      <div className="text-xs text-muted">{hit.snippet}</div>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function routeForHit(hit: SearchHit) {
  if (hit.type === "item") return `/item/${hit.id}`;
  if (hit.type === "doc") return `/doc/${hit.id}`;
  if (hit.type === "comment" && "itemId" in hit) return `/item/${hit.itemId}`;
  return "/search";
}
