import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "theme", "global.css"), "utf8");
const tokens = readFileSync(join(process.cwd(), "src", "theme", "tokens.css"), "utf8");

function cssRule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m"));
  if (!match) throw new Error(`Missing CSS rule for ${selector}`);
  return match[1];
}

describe("global lane layout CSS", () => {
  it("keeps bug triage buckets wide enough to read dense bug cards", () => {
    const rule = cssRule(".bugs");

    expect(rule).toContain("overflow-x: auto");
    expect(rule).toContain("grid-template-columns: repeat(3, minmax(var(--work-lane-wide-min), 1fr))");
  });

  it("uses a shared readable lane width for board columns", () => {
    const rule = cssRule(".board-column");

    expect(rule).toContain("width: var(--work-lane-min)");
  });
});

describe("responsive shell CSS", () => {
  it("supports a compact desktop icon rail without changing the mobile drawer", () => {
    expect(tokens).toContain("--sidebar-rail-width: 56px");
    expect(cssRule(".app-shell")).toContain(
      "grid-template-columns: var(--active-sidebar-width) minmax(0, 1fr)"
    );
    expect(cssRule('.app-shell[data-sidebar-state="collapsed"]')).toContain(
      "--active-sidebar-width: var(--sidebar-rail-width)"
    );
    expect(
      cssRule('.app-shell[data-sidebar-state="collapsed"] .app-sidebar .sidebar-link-label')
    ).toContain("display: none");
    expect(cssRule(".app-header .mobile-nav-trigger")).toContain("display: none");
  });

  it("allows the shell grid and content to shrink without page-level overflow", () => {
    expect(cssRule(".app-shell")).toContain("minmax(0, 1fr)");
    expect(cssRule(".app-shell")).toContain("overflow: hidden");
    expect(cssRule(".app-header")).toContain("overflow: hidden");
    expect(cssRule(".app-main")).toContain("min-width: 0");
  });

  it("keeps project header actions on one line", () => {
    expect(cssRule(".shell-project-actions")).toContain("flex-wrap: nowrap");
  });
});
