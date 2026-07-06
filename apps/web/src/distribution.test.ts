import { describe, expect, it } from "vitest";
import { resolveWebAppDistribution } from "./distribution";

describe("resolveWebAppDistribution", () => {
  it("treats the GitHub Pages base path as the hosted demo", () => {
    expect(resolveWebAppDistribution({ baseUrl: "/Grillo-Project-Hub/" })).toBe("hosted-demo");
  });

  it("allows an explicit local override for self-hosted or development builds", () => {
    expect(resolveWebAppDistribution({
      baseUrl: "/Grillo-Project-Hub/",
      configuredDistribution: "local"
    })).toBe("local");
  });

  it("keeps the default root development build local", () => {
    expect(resolveWebAppDistribution({ baseUrl: "/" })).toBe("local");
  });
});
