import { type ChangeEvent, type MouseEvent, useEffect, useMemo, useState } from "react";
import { FileText, Folder as FolderIcon, Plus, Search } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DOMPurify, { type Config as DOMPurifyConfig } from "dompurify";
import {
  DOCUMENT_TEMPLATES,
  deriveBacklinks,
  parseDocLinks,
  type DocTemplateId,
  type Document,
  type Folder,
  type WorkItem
} from "@gph/core";
import { Button, ConfirmDialog, EmptyState } from "../../components";
import { useProjectStore } from "../../store/project-store";

/**
 * Docs view with a knowledge-oriented workspace.
 *
 *  - Documents can be grouped into command-backed sections.
 *  - Templates create useful starting bodies without bypassing the dispatcher.
 *  - Backlinks and linked work are derived from [[doc:id]] and [[item:id]] references.
 *  - Markdown is sanitized; we do not execute arbitrary HTML.
 */
export function DocsView() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const navigate = useNavigate();
  const { docId } = useParams<{ docId?: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [templateId, setTemplateId] = useState<DocTemplateId | "">("");
  const [newSectionName, setNewSectionName] = useState("");

  const activeDocs = useMemo(() => (bundle?.core.documents ?? []).filter((doc) => !doc.archived), [bundle?.core.documents]);
  const activeFolders = useMemo(() => (bundle?.core.folders ?? []).filter((folder) => !folder.archived), [bundle?.core.folders]);
  const foldersById = useMemo(() => new Map(activeFolders.map((folder) => [folder.id, folder])), [activeFolders]);
  const filteredDocs = useMemo(
    () => activeDocs.filter((doc) => docMatchesQuery(doc, foldersById, searchQuery)),
    [activeDocs, foldersById, searchQuery]
  );
  const requestedDoc = docId ? activeDocs.find((doc) => doc.id === docId) ?? null : null;
  const fallbackDoc = activeDocs[0] ?? null;
  const current = requestedDoc ?? fallbackDoc;
  const backlinks = useMemo(() => {
    const m = deriveBacklinks(activeDocs);
    if (!current) return [] as Document[];
    return (m.get(current.id) ?? []).map((id) => activeDocs.find((doc) => doc.id === id)).filter(Boolean) as Document[];
  }, [activeDocs, current?.id]);

  useEffect(() => {
    if (docId && !requestedDoc && fallbackDoc) {
      navigate(`/doc/${fallbackDoc.id}`, { replace: true });
    }
  }, [docId, fallbackDoc?.id, navigate, requestedDoc?.id]);

  if (!bundle) return null;

  const createDocument = () => {
    const payload = templateId
      ? { type: "doc.create" as const, projectId: bundle.project.id, templateId }
      : { type: "doc.create" as const, projectId: bundle.project.id, title: "Untitled" };
    const result = applyCommand(payload);
    const newId = result.bundle.core.documents[result.bundle.core.documents.length - 1].id;
    navigate(`/doc/${newId}`);
  };

  const createSection = () => {
    const name = newSectionName.trim();
    if (!name) return;
    applyCommand({ type: "docFolder.create", projectId: bundle.project.id, name });
    setNewSectionName("");
  };

  return (
    <div className="docs-layout">
      <aside className="docs-sidebar" aria-label="Docs">
        <div className="row-between docs-sidebar-heading">
          <strong>Docs</strong>
          <Button size="sm" variant="primary" onClick={createDocument}>
            <Plus aria-hidden="true" size={16} />
            New document
          </Button>
        </div>

        <div className="docs-sidebar-controls">
          <label className="field-label">
            Search docs
            <div className="input-with-icon">
              <Search aria-hidden="true" size={14} />
              <input
                className="input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </label>

          <label className="field-label">
            Document template
            <select className="select" value={templateId} onChange={(event) => setTemplateId(event.target.value as DocTemplateId | "")}>
              <option value="">Blank document</option>
              {DOCUMENT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <div className="docs-section-form">
            <label className="field-label">
              New section name
              <input
                className="input"
                value={newSectionName}
                onChange={(event) => setNewSectionName(event.target.value)}
              />
            </label>
            <Button size="sm" onClick={createSection}>Add section</Button>
          </div>
        </div>

        <DocTree
          docs={filteredDocs}
          folders={activeFolders}
          currentDocId={current?.id ?? null}
          searchQuery={searchQuery}
        />
      </aside>

      <main className="docs-content">
        {current ? (
          <DocEditor doc={current} folders={activeFolders} />
        ) : (
          <EmptyState
            title="No documents"
            description="Create your first doc to capture decisions, release notes, bug context, and project briefs."
            actions={<Button variant="primary" onClick={createDocument}>New document</Button>}
          />
        )}
      </main>

      <DocsContext doc={current} docs={activeDocs} items={bundle.core.items} backlinks={backlinks} />
    </div>
  );
}

function DocTree({
  docs,
  folders,
  currentDocId,
  searchQuery
}: {
  docs: Document[];
  folders: Folder[];
  currentDocId: string | null;
  searchQuery: string;
}) {
  const unfiledDocs = docs.filter((doc) => doc.folderId == null || !folders.some((folder) => folder.id === doc.folderId));
  const hasAnyDocs = docs.length > 0;

  if (!hasAnyDocs) {
    return (
      <div className="docs-empty-list">
        {searchQuery.trim() ? "No docs match this search." : "No docs yet."}
      </div>
    );
  }

  return (
    <div className="docs-tree">
      {folders.map((folder) => {
        const folderDocs = docs.filter((doc) => doc.folderId === folder.id);
        if (folderDocs.length === 0 && searchQuery.trim()) return null;
        return (
          <section key={folder.id} className="docs-tree-section" aria-label={folder.name}>
            <div className="docs-tree-section-title">
              <FolderIcon aria-hidden="true" size={14} />
              <span>{folder.name}</span>
            </div>
            {folderDocs.length === 0 ? <div className="docs-empty-list">No docs in this section.</div> : folderDocs.map((doc) => (
              <DocTreeLink key={doc.id} doc={doc} currentDocId={currentDocId} />
            ))}
          </section>
        );
      })}

      {unfiledDocs.length > 0 && (
        <section className="docs-tree-section" aria-label="Unfiled">
          {folders.length > 0 && <div className="docs-tree-section-title">Unfiled</div>}
          {unfiledDocs.map((doc) => (
            <DocTreeLink key={doc.id} doc={doc} currentDocId={currentDocId} />
          ))}
        </section>
      )}
    </div>
  );
}

function DocTreeLink({ doc, currentDocId }: { doc: Document; currentDocId: string | null }) {
  return (
    <Link key={doc.id} to={`/doc/${doc.id}`} className="doc-tree-node" aria-current={doc.id === currentDocId}>
      <FileText aria-hidden="true" size={14} />
      <span>{doc.title}</span>
    </Link>
  );
}

function DocEditor({ doc, folders }: { doc: Document; folders: Folder[] }) {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const navigate = useNavigate();
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  const [tab, setTab] = useState<"edit" | "preview">("preview");
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    setTitle(doc.title);
    setBody(doc.body);
  }, [doc.id]);

  if (!bundle) return null;

  const save = () => {
    applyCommand({ type: "doc.update", projectId: bundle.project.id, docId: doc.id, patch: { title, body } });
  };

  const moveSection = (event: ChangeEvent<HTMLSelectElement>) => {
    applyCommand({
      type: "doc.move",
      projectId: bundle.project.id,
      docId: doc.id,
      toFolderId: event.target.value || null
    });
  };

  const handlePreviewClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a[data-route]") as HTMLAnchorElement | null;
    if (!anchor) return;
    const route = anchor.dataset.route;
    if (!route?.startsWith("/")) return;
    event.preventDefault();
    navigate(route);
  };

  return (
    <>
      <div className="col docs-editor" style={{ gap: 12 }}>
        <input
          aria-label="Document title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, border: 0, padding: 0 }}
        />
        <div className="docs-editor-toolbar">
          <div className="row">
            <button className={`btn btn-sm ${tab === "edit" ? "btn-primary" : ""}`} onClick={() => setTab("edit")}>Edit</button>
            <button className={`btn btn-sm ${tab === "preview" ? "btn-primary" : ""}`} onClick={() => { save(); setTab("preview"); }}>Preview</button>
          </div>
          <label className="docs-section-select">
            Document section
            <select className="select" value={doc.folderId ?? ""} onChange={moveSection}>
              <option value="">Unfiled</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </label>
          <span className="text-xs text-muted">Last updated {new Date(doc.updatedAt).toLocaleString()}</span>
          <span className="spacer" />
          <Button size="sm" variant="danger" onClick={() => setDeletePending(true)}>Delete</Button>
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
          <div className="docs-preview" onClick={handlePreviewClick}>
            <RenderMarkdown body={body} />
          </div>
        )}
      </div>
      {deletePending ? (
        <ConfirmDialog
          title="Move document to trash"
          message="This document will be moved out of the active docs list."
          destructive
          confirmLabel="Move to trash"
          onCancel={() => setDeletePending(false)}
          onConfirm={() => {
            const activeDocs = bundle.core.documents.filter((entry) => !entry.archived);
            const currentIndex = activeDocs.findIndex((entry) => entry.id === doc.id);
            const nextDoc = activeDocs[currentIndex + 1] ?? activeDocs[currentIndex - 1] ?? null;
            applyCommand({ type: "doc.delete", projectId: bundle.project.id, docId: doc.id });
            setDeletePending(false);
            navigate(nextDoc ? `/doc/${nextDoc.id}` : "/docs");
          }}
        />
      ) : null}
    </>
  );
}

function DocsContext({
  doc,
  docs,
  items,
  backlinks
}: {
  doc: Document | null;
  docs: Document[];
  items: WorkItem[];
  backlinks: Document[];
}) {
  const links = useMemo(() => (doc ? parseDocLinks(doc.body) : []), [doc]);
  const linkedItems = links
    .filter((link) => link.refType === "workItem")
    .map((link) => ({
      link,
      item: items.find((item) => item.id === link.refId) ?? null
    }));
  const referencedDocs = links
    .filter((link) => link.refType === "document")
    .map((link) => ({
      link,
      doc: docs.find((entry) => entry.id === link.refId) ?? null
    }));

  return (
    <aside className="docs-context" aria-label="Document context">
      <section>
        <h2>Linked work</h2>
        {linkedItems.length === 0 ? (
          <p className="text-sm text-muted">No linked work in this document.</p>
        ) : (
          <div className="docs-context-list">
            {linkedItems.map(({ link, item }) =>
              item ? (
                <Link key={`${link.refId}-${link.order}`} to={`/item/${item.id}`} className="docs-context-row">
                  <span>{link.label === link.refId ? item.title : link.label}</span>
                  <span className="text-xs text-muted">{item.statusId}</span>
                </Link>
              ) : (
                <div key={`${link.refId}-${link.order}`} className="docs-context-row docs-context-row-muted">
                  Missing item: {link.refId}
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section>
        <h2>Referenced docs</h2>
        {referencedDocs.length === 0 ? (
          <p className="text-sm text-muted">No outgoing doc links.</p>
        ) : (
          <div className="docs-context-list">
            {referencedDocs.map(({ link, doc }) =>
              doc ? (
                <Link key={`${link.refId}-${link.order}`} to={`/doc/${doc.id}`} className="docs-context-row">
                  {link.label === link.refId ? doc.title : link.label}
                </Link>
              ) : (
                <div key={`${link.refId}-${link.order}`} className="docs-context-row docs-context-row-muted">
                  Missing doc: {link.refId}
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section>
        <h2>Backlinks</h2>
        {backlinks.length === 0 ? (
          <p className="text-sm text-muted">No docs link back here yet.</p>
        ) : (
          <div className="docs-context-list">
            {backlinks.map((backlink) => (
              <Link key={backlink.id} to={`/doc/${backlink.id}`} className="docs-context-row">
                {backlink.title}
              </Link>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

function docMatchesQuery(doc: Document, foldersById: Map<string, Folder>, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const folderName = doc.folderId ? foldersById.get(doc.folderId)?.name ?? "" : "";
  return [doc.title, doc.body, folderName].some((value) => value.toLowerCase().includes(normalized));
}

/**
 * Tiny, safe Markdown renderer.
 *
 *  - Renders headings, paragraphs, lists, code, links, and [[doc:id]] / [[item:id]] internal links.
 *  - Emits a constrained HTML subset (headings, lists, paragraphs, strong/em, code, internal links).
 *  - Sanitizes the final HTML through DOMPurify so any HTML the user types in the source
 *    (including `javascript:` URIs, `on*` handlers, and `<script>`/`<iframe>` tags) is stripped
 *    before injection. Internal preview routing uses a stable `data-route` attribute so click
 *    interception does not depend on a presentational CSS class name.
 */
function RenderMarkdown({ body }: { body: string }) {
  const html = useMemo(() => renderMarkdownSafe(body), [body]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

const PURIFY_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS: ["a", "div", "h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "strong", "em", "code", "br", "span"],
  ALLOWED_ATTR: ["href", "class", "data-route", "data-doc", "data-item", "data-attachment"],
  ALLOW_DATA_ATTR: false
};

function renderMarkdownSafe(input: string): string {
  // Build the safe HTML. We escape inline text ourselves; the only inline HTML we emit
  // is the controlled subset above, so DOMPurify's allowlist is sufficient.
  let text = input;
  // Internal links: emit safe, no user-supplied attribute values that bypass sanitization.
  text = text.replace(/\[\[doc:([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => `<a class="docs-link" href="/doc/${id}" data-route="/doc/${id}">${escapeHtml(label ?? id)}</a>`);
  text = text.replace(/\[\[item:([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => `<a class="docs-link" href="/item/${id}" data-route="/item/${id}">${escapeHtml(label ?? id)}</a>`);
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
