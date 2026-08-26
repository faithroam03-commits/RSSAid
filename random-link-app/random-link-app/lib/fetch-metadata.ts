import * as cheerio from "cheerio";
import dns from "node:dns/promises";
import net from "node:net";

const MAX_HTML_BYTES = 2_000_000;
const TIMEOUT_MS = 8_000;

function isPrivateIPv4(ip: string) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) return false;
  return (
    p[0] === 10 ||
    p[0] === 127 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    p[0] === 0
  );
}

function isPrivateIPv6(ip: string) {
  const x = ip.toLowerCase();
  return (
    x === "::1" ||
    x === "::" ||
    x.startsWith("fc") ||
    x.startsWith("fd") ||
    x.startsWith("fe8") ||
    x.startsWith("fe9") ||
    x.startsWith("fea") ||
    x.startsWith("feb")
  );
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URLの形式が正しくありません。");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("http / https のURLのみ登録できます。");
  }

  if (url.username || url.password) {
    throw new Error("認証情報を含むURLは登録できません。");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("localhost は登録できません。");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
      throw new Error("プライベートIPは登録できません。");
    }
  } else {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses.length) throw new Error("ホスト名を解決できません。");
    for (const a of addresses) {
      if (isPrivateIPv4(a.address) || isPrivateIPv6(a.address)) {
        throw new Error("プライベートネットワークを指すURLは登録できません。");
      }
    }
  }
  return url;
}

function absoluteUrl(value: string | undefined, base: URL): string | null {
  if (!value) return null;
  try {
    const u = new URL(value, base);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function fetchPageMetadata(rawUrl: string) {
  const initialUrl = await assertSafeUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(initialUrl, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "RandomLinkApp/0.1 (+personal bookmark preview)"
      }
    });

    // Redirect先も再検証してSSRFを防ぐ
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("リダイレクト先を取得できません。");
      const next = new URL(location, initialUrl).toString();
      await assertSafeUrl(next);
      return fetchPageMetadata(next);
    }

    if (!res.ok) throw new Error(`ページ取得に失敗しました (${res.status})`);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("HTMLページではありません。");
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("ページ本文を取得できません。");

    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_HTML_BYTES) {
          reader.cancel();
          throw new Error("ページサイズが大きすぎます。");
        }
        chunks.push(value);
      }
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const html = new TextDecoder("utf-8").decode(bytes);
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $('meta[name="twitter:title"]').attr("content")?.trim() ||
      $("title").first().text().trim() ||
      initialUrl.hostname;

    const image =
      absoluteUrl($('meta[property="og:image"]').attr("content")?.trim(), initialUrl) ||
      absoluteUrl($('meta[name="twitter:image"]').attr("content")?.trim(), initialUrl) ||
      absoluteUrl($('link[rel="image_src"]').attr("href")?.trim(), initialUrl);

    const candidates = new Set<string>();
    if (image) candidates.add(image);

    $("img").each((_, el) => {
      if (candidates.size >= 30) return;
      const src =
        $(el).attr("src") ||
        $(el).attr("data-src") ||
        $(el).attr("data-lazy-src");
      const abs = absoluteUrl(src?.trim(), initialUrl);
      if (abs) candidates.add(abs);
    });

    return {
      finalUrl: initialUrl.toString(),
      title: title.slice(0, 300),
      thumbnailUrl: image,
      imageCandidates: [...candidates]
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("ページ取得がタイムアウトしました。");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
