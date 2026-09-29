export type BrowserChoice =
  | "default"
  | "chrome"
  | "firefox"
  | "edge"
  | "brave"
  | "vivaldi"
  | "opera";

export const BROWSER_STORAGE_KEY =
  "randomLinkOpenBrowser";

const browserPackages: Record<
  Exclude<BrowserChoice, "default" | "chrome">,
  string
> = {
  firefox: "org.mozilla.firefox",
  edge: "com.microsoft.emmx",
  brave: "com.brave.browser",
  vivaldi: "com.vivaldi.browser",
  opera: "com.opera.browser",
};

export function getBrowserChoice(): BrowserChoice {
  const saved = localStorage.getItem(
    BROWSER_STORAGE_KEY,
  );

  if (
    saved === "default" ||
    saved === "chrome" ||
    saved === "firefox" ||
    saved === "edge" ||
    saved === "brave" ||
    saved === "vivaldi" ||
    saved === "opera"
  ) {
    return saved;
  }

  return "default";
}

export function openInBrowser(
  url: string,
  choice = getBrowserChoice(),
) {
  if (choice === "default" || choice === "chrome") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const packageName = browserPackages[choice];

  const withoutScheme = url.replace(
    /^https?:\/\//,
    "",
  );

  const scheme = url.startsWith("http://")
    ? "http"
    : "https";

  window.location.href =
    `intent://${withoutScheme}` +
    "#Intent;" +
    `scheme=${scheme};` +
    `package=${packageName};` +
    "end";
}