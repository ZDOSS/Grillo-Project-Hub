import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DOMPurify, { type Config as DOMPurifyConfig } from "dompurify";
import { useProjectStore } from "../../store/project-store";
import { deriveBacklinks, parseDocLinks, type Document } from "@gph/core";

/**
 * Docs view with simple side-by-side Markdown rendering.
 *
 *  - Documents have stable IDs and survive rename/move.
 *  - Backlinks are derived from [[doc:id]] and [[item:id]] links.
 *  - Internal embeds via ![[doc:id]] / ![[item:id]] / ![[attachment:id]].
 *  - Markdown is sanitized; we do not execute arbitrary HTML.
 */
export function DocsView() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const navigate = useNavigate();
  const { docId } = useParams<{ docId?: string }>();
  const [newTitle, setNewTitle] = useState("");

  if (!bundle) return null;
  const docs = bundle.core.documents;
  const current = docId ? docs.find((d) => d.id === docId) : docs[0] ?? null;
  const backlinks = useMemo(() => {
    const m = deriveBacklinks(docs);
    if (!current) return [] as Document[];
    return (m.get(current.id) ?? []).map((id) => docs.find((d) => d.id === id)).filter(Boolean) as Document[];
  }, [docs, current?.id]);

  return (
    <div className="docs-layout">
      <aside className="docs-sidebar">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <strong>Docs</strong>
          <button className="btn btn-sm btn-primary" onClick={() => {
            const r = applyCommand({ type: "doc.create", projectId: bundle.project.id, title: "Untitled" });
            const newId = r.bundle.core.documents[r.bundle.core.documents.length - 1].id;
            navigate(`/doc/${newId}`);
          }}>+</button>
        </div>
        <div className="col" style={{ gap: 2 }}>
          {docs.length === 0 && <div className="text-muted text-sm">No docs yet</div>}
          {docs.map((d) => (
            <a
              key={d.id}
              href={`/doc/${d.id}`}
              className="doc-tree-node"
              aria-current={d.id === current?.id}
            >
              <span>📄</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</span>
            </a>
          ))}
        </div>
      </aside>
      <main className="docs-content">
        {current ? (
          <DocEditor doc={current} backlinks={backlinks} />
        ) : (
          <div className="empty">
            <div className="empty-title">No documents</div>
            <div>Create your first doc to capture decisions, design notes, and onboarding.</div>
            <div className="row" style={{ marginTop: 8 }}>
              <input className="input" placeholder="Document title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <button className="btn btn-primary" onClick={() => {
                if (!newTitle.trim()) return;
                const r = applyCommand({ type: "doc.create", projectId: bundle.project.id, title: newTitle.trim() });
                const id = r.bundle.core.documents[r.bundle.core.documents.length - 1].id;
                setNewTitle("");
                navigate(`/doc/${id}`);
              }}>Create</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DocEditor({ doc, backlinks }: { doc: Document; backlinks: Document[] }) {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  const [tab, setTab] = useState<"edit" | "preview">("preview");

  if (!bundle) return null;

  const save = () => {
    applyCommand({ type: "doc.update", projectId: bundle.project.id, docId: doc.id, patch: { title, body } });
  };

  return (
    <div className="col" style={{ gap: 12, height: "100%" }}>
      <input
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, border: 0, padding: 0 }}
      />
      <div className="row">
        <button className={`btn btn-sm ${tab === "edit" ? "btn-primary" : ""}`} onClick={() => setTab("edit")}>Edit</button>
        <button className={`btn btn-sm ${tab === "preview" ? "btn-primary" : ""}`} onClick={() => { save(); setTab("preview"); }}>Preview</button>
        <span className="text-xs text-muted">Last updated {new Date(doc.updatedAt).toLocaleString()}</span>
        <span className="spacer" />
        <button className="btn btn-sm btn-danger" onClick={() => {
          if (confirm("Move this document to trash?")) {
            applyCommand({ type: "doc.delete", projectId: bundle.project.id, docId: doc.id });
          }
        }}>Delete</button>
      </div>
      {tab === "edit" ? (
        <textarea
          className="textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={save}
          style={{ flex: 1, minHeight: 400 }}
        />
      ) : (
        <div className="docs-content" style={{ padding: 0 }}>
          <RenderMarkdown body={body} />
        </div>
      )}
      {backlinks.length > 0 && (
        <div className="col" style={{ gap: 4, marginTop: 12 }}>
          <h3 style={{ fontSize: "var(--font-size-xs)", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Backlinks</h3>
          {backlinks.map((b) => (
            <a key={b.id} href={`/doc/${b.id}`} className="tag tag-info">{b.title}</a>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Tiny, safe Markdown renderer.
 *
 *  - Renders headings, paragraphs, lists, code, links, and [[doc:id]] / [[item:id]] internal links.
 *  - Emits a constrained HTML subset (headings, lists, paragraphs, strong/em, code, internal links).
 *  - Sanitizes the final HTML through DOMPurify so any HTML the user types in the source
 *    (including `javascript:` URIs, `on*` handlers, and `<script>`/`<iframe>` tags) is stripped
 *    before injection. Internal `docs-link` / `docs-embed` markers and their `href`s / `data-*`
 *    attributes are allowlisted explicitly.
 */
function RenderMarkdown({ body }: { body: string }) {
  const html = useMemo(() => renderMarkdownSafe(body), [body]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

const PURIFY_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS: ["a", "div", "h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "strong", "em", "code", "br", "span"],
  ALLOWED_ATTR: ["href", "class", "data-doc", "data-item", "data-attachment"],
  ALLOW_DATA_ATTR: false
};

function renderMarkdownSafe(input: string): string {
  // Build the safe HTML. We escape inline text ourselves; the only inline HTML we emit
  // is the controlled subset above, so DOMPurify's allowlist is sufficient.
  let text = input;
  // Internal links: emit safe, no user-supplied attribute values that bypass sanitization.
  text = text.replace(/\[\[doc:([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => `<a class="docs-link" href="/doc/${id}">${escapeHtml(label ?? id)}</a>`);
  text = text.replace(/\[\[item:([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => `<a class="docs-link" href="/item/${id}">${escapeHtml(label ?? id)}</a>`);
  text = text.replace(/!\[\[doc:([a-zA-Z0-9_-]+)\]\]/g, (_, id) => `<div class="docs-embed" data-doc="${id}">[doc embed: ${escapeHtml(id)}]</div>`);
  text = text.replace(/!\[\[item:([a-zA-Z0-9_-]+)\]\]/g, (_, id) => `<div class="docs-embed" data-item="${id}">[item embed: ${escapeHtml(id)}]</div>`);
  // Headings
  text = text.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  text = text.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  text = text.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  // Bold/italic
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, "$1<em>$2</em>");
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bullet lists
  text = text.replace(/(^|\n)((?:- .*(?:\n|$))+)/g, (_, lead, block) => lead + "<ul>" + block.replace(/^- (.*)$/gm, "<li>$1</li>") + "</ul>");
  // Numbered lists
  text = text.replace(/(^|\n)((?:\d+\. .*(?:\n|$))+)/g, (_, lead, block) => lead + "<ol>" + block.replace(/^\d+\. (.*)$/gm, "<li>$1</li>") + "</ol>");
  // Paragraphs
  text = text.split(/\n{2,}/).map((p) => /^<(h\d|ul|ol|pre|blockquote)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n");
  // Sanitize: strips javascript:/vbscript:/data: URIs, on* handlers, <script>/<iframe>/etc.
  return DOMPurify.sanitize(text, PURIFY_CONFIG);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
