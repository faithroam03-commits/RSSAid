import * as cheerio from "cheerio";
import dns from "node:dns/promises";
import net from "node:net";

const MAX_HTML_BYTES = 2_000_000;
const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 5;

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
const addresses: string[] = [];

try {
  addresses.push(...(await dns.resolve4(hostname)));
} catch {}

try {
  addresses.push(...(await dns.resolve6(hostname)));
} catch {}

if (!addresses.length) {
  throw new Error("ホスト名を解決できません。");
}

for (const address of addresses) {
  if (isPrivateIPv4(address) || isPrivateIPv6(address)) {
    throw new Error(
      "プライベートネットワークを指すURLは登録できません。"
    );
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

async function fetchFrameImageCandidates(
  frameUrl: string,
  redirectCount = 0,
): Promise<string[]> {
  const safeUrl = await assertSafeUrl(frameUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(safeUrl, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "RandomLinkApp/0.1 (+personal bookmark preview)",
      },
    });

    // frameのリダイレクト先も再度SSRFチェックする。
    if (res.status >= 300 && res.status < 400) {
      if (redirectCount >= MAX_REDIRECTS) {
        return [];
      }

      const location = res.headers.get("location");

      if (!location) {
        return [];
      }

      const next = new URL(location, safeUrl).toString();

      await assertSafeUrl(next);

      return fetchFrameImageCandidates(
        next,
        redirectCount + 1,
      );
    }

    if (!res.ok) {
      return [];
    }

    const contentType = res.headers.get("content-type") || "";

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      return [];
    }

    const reader = res.body?.getReader();

    if (!reader) {
      return [];
    }

    let total = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      if (value) {
        total += value.byteLength;

        if (total > MAX_HTML_BYTES) {
          await reader.cancel();
          return [];
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

    // frame内では画像URLの抽出だけが目的なので、
    // HTMLタグを認識できればよい。
    const html = new TextDecoder("latin1").decode(bytes);
    const $ = cheerio.load(html);

    const candidates = new Set<string>();

    $("img").each((_, el) => {
      if (candidates.size >= 30) return;

      const values = [
        $(el).attr("src"),
        $(el).attr("data-src"),
        $(el).attr("data-lazy-src"),
        $(el).attr("data-original"),
      ];

      for (const value of values) {
        if (candidates.size >= 30) break;

        const abs = absoluteUrl(
          value?.trim(),
          safeUrl,
        );

        if (abs) {
          candidates.add(abs);
        }
      }
    });

    return [...candidates];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPageMetadata(rawUrl: string, redirectCount = 0) {
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
  if (redirectCount >= MAX_REDIRECTS) {
    throw new Error("リダイレクト回数が多すぎます。");
  }

  const location = res.headers.get("location");
  if (!location) throw new Error("リダイレクト先を取得できません。");

  const next = new URL(location, initialUrl).toString();
  await assertSafeUrl(next);

  return fetchPageMetadata(next, redirectCount + 1);
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

    // HTTPヘッダーまたはHTML内のmetaタグから文字コードを判定する。
    // 古い日本語サイトのShift_JIS / Windows-31Jにも対応する。
    let charset = "";

    const headerCharset = contentType.match(
      /charset\s*=\s*["']?\s*([^;"'\s]+)/i,
    );

    if (headerCharset?.[1]) {
      charset = headerCharset[1].toLowerCase();
    }

    if (!charset) {
      // charset宣言部分はASCII文字なので、判定用として先頭部分だけ
      // latin1で読み取る。
      const headBytes = bytes.slice(0, Math.min(bytes.length, 8192));
      const headText = new TextDecoder("latin1").decode(headBytes);

      const metaCharset = headText.match(
        /<meta[^>]+charset\s*=\s*["']?\s*([^"'\s/>;]+)/i,
      );

      const httpEquivCharset = headText.match(
        /<meta[^>]+http-equiv\s*=\s*["']?content-type["']?[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([^"'\s;>]+)/i,
      );

      charset = (
        metaCharset?.[1] ||
        httpEquivCharset?.[1] ||
        ""
      ).toLowerCase();
    }

    let decoderEncoding = "utf-8";

    if (
      charset === "shift_jis" ||
      charset === "shift-jis" ||
      charset === "sjis" ||
      charset === "windows-31j" ||
      charset === "cp932" ||
      charset === "ms932"
    ) {
      decoderEncoding = "shift_jis";
    } else if (
      charset === "euc-jp" ||
      charset === "euc_jp"
    ) {
      decoderEncoding = "euc-jp";
    } else if (
      charset === "iso-2022-jp"
    ) {
      decoderEncoding = "iso-2022-jp";
    }

    let html: string;

    try {
      html = new TextDecoder(decoderEncoding).decode(bytes);
    } catch {
      // 未対応・不明なcharsetなら従来どおりUTF-8として処理する。
      html = new TextDecoder("utf-8").decode(bytes);
    }

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

  const values = [
    $(el).attr("src"),
    $(el).attr("data-src"),
    $(el).attr("data-lazy-src"),
    $(el).attr("data-original"),
  ];

  for (const value of values) {
    if (candidates.size >= 30) break;

    const abs = absoluteUrl(value?.trim(), initialUrl);
    if (abs) {
      candidates.add(abs);
    }
  }

  const srcsets = [
    $(el).attr("srcset"),
    $(el).attr("data-srcset"),
  ];

  for (const srcset of srcsets) {
    if (!srcset) continue;

    for (const part of srcset.split(",")) {
      if (candidates.size >= 30) break;

      const value = part.trim().split(/\s+/)[0];
      const abs = absoluteUrl(value, initialUrl);

      if (abs) {
        candidates.add(abs);
      }
    }
  }
});

    $("source").each((_, el) => {
  if (candidates.size >= 30) return;

  const srcsets = [
    $(el).attr("srcset"),
    $(el).attr("data-srcset"),
  ];

  for (const srcset of srcsets) {
    if (!srcset) continue;

    for (const part of srcset.split(",")) {
      if (candidates.size >= 30) break;

      const value = part.trim().split(/\s+/)[0];
      const abs = absoluteUrl(value, initialUrl);

      if (abs) {
        candidates.add(abs);
      }
    }
  }
});

$("[style]").each((_, el) => {
  if (candidates.size >= 30) return;

  const style = $(el).attr("style");
  if (!style) return;

  const matches =
    style.matchAll(
      /background(?:-image)?\s*:\s*url\((['"]?)(.*?)\1\)/gi
    );

  for (const match of matches) {
    if (candidates.size >= 30) break;

    const abs = absoluteUrl(
      match[2]?.trim(),
      initialUrl
    );

    if (abs) {
      candidates.add(abs);
    }
  }
});

        // 古いframesetサイトに対応。
    // 無制限には巡回せず、トップページ直下のframeを最大3件だけ確認する。
    const frameUrls: string[] = [];

    $("frame[src]").each((_, el) => {
      if (frameUrls.length >= 3) return;

      const frameUrl = absoluteUrl(
        $(el).attr("src")?.trim(),
        initialUrl,
      );

      if (frameUrl) {
        frameUrls.push(frameUrl);
      }
    });

    for (const frameUrl of frameUrls) {
      if (candidates.size >= 30) break;

      try {
        // frame先もSSRFチェックしてから取得する。
        await assertSafeUrl(frameUrl);

        const frameImages =
          await fetchFrameImageCandidates(frameUrl);

        for (const frameImage of frameImages) {
          if (candidates.size >= 30) break;
          candidates.add(frameImage);
        }
      } catch {
        // frameを取得できなくても元ページの解析結果は返す。
      }
    }
    
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
