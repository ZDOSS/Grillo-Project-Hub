import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "theme", "global.css"), "utf8");

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
