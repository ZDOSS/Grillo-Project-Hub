export type WebAppDistribution = "local" | "hosted-demo";

type ResolveWebAppDistributionOptions = {
  baseUrl?: string;
  configuredDistribution?: string | boolean;
};

export function resolveWebAppDistribution({
  baseUrl = "/",
  configuredDistribution
}: ResolveWebAppDistributionOptions): WebAppDistribution {
  if (configuredDistribution === "local" || configuredDistribution === "hosted-demo") {
    return configuredDistribution;
  }
  if (configuredDistribution === true || configuredDistribution === "true") {
    return "hosted-demo";
  }
  return baseUrl === "/Grillo-Project-Hub/" ? "hosted-demo" : "local";
}
