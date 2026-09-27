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

export async function assertSafeUrl(
  raw: string,
): Promise<URL> {
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

type BilibiliMetadata = {
  title: string;
  thumbnailUrl: string;
};

function getBilibiliBvid(url: URL): string | null {
  const hostname = url.hostname.toLowerCase();

  if (
    hostname !== "www.bilibili.com" &&
    hostname !== "m.bilibili.com" &&
    hostname !== "bilibili.com"
  ) {
    return null;
  }

  const match = url.pathname.match(
    /\/video\/(BV[0-9A-Za-z]{10})(?:\/|$)/i,
  );

  return match?.[1] ?? null;
}

async function fetchBilibiliMetadata(
  bvid: string,
): Promise<BilibiliMetadata | null> {
  const apiUrl = new URL(
    "https://api.bilibili.com/x/web-interface/view",
  );

  apiUrl.searchParams.set("bvid", bvid);

  // APIの接続先も通常URLと同様にSSRFチェックする。
  await assertSafeUrl(apiUrl.toString());

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS,
  );

  try {
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
        referer: `https://www.bilibili.com/video/${bvid}/`,
        accept: "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as {
      code?: number;
      data?: {
        title?: string;
        pic?: string;
      };
    };

    if (
      json.code !== 0 ||
      !json.data ||
      typeof json.data.title !== "string" ||
      typeof json.data.pic !== "string"
    ) {
      return null;
    }

    const title = json.data.title.trim();
    const thumbnailUrl = json.data.pic.trim();

    if (!title || !thumbnailUrl) {
      return null;
    }

    return {
      title,
      thumbnailUrl,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type YouTubeMetadata = {
  title: string;
  thumbnailUrl: string;
  imageCandidates: string[];
};

function getYouTubeVideoId(url: URL): string | null {
  const hostname = url.hostname.toLowerCase();
  let videoId: string | null = null;

  if (
    hostname === "youtube.com" ||
    hostname === "www.youtube.com" ||
    hostname === "m.youtube.com"
  ) {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else {
      const match = url.pathname.match(
        /^\/(?:shorts|live)\/([0-9A-Za-z_-]{11})(?:\/|$)/,
      );
      videoId = match?.[1] ?? null;
    }
  } else if (
    hostname === "youtu.be" ||
    hostname === "www.youtu.be"
  ) {
    const match = url.pathname.match(
      /^\/([0-9A-Za-z_-]{11})(?:\/|$)/,
    );
    videoId = match?.[1] ?? null;
  }

  if (!videoId || !/^[0-9A-Za-z_-]{11}$/.test(videoId)) {
    return null;
  }

  return videoId;
}

async function fetchYouTubeMetadata(
  videoId: string,
): Promise<YouTubeMetadata | null> {
  const apiKey = process.env.RL_YOUTUBE_API;

  if (!apiKey) {
    return null;
  }

  const apiUrl = new URL(
    "https://www.googleapis.com/youtube/v3/videos",
  );

  apiUrl.searchParams.set("part", "snippet");
  apiUrl.searchParams.set("id", videoId);
  apiUrl.searchParams.set("key", apiKey);

  await assertSafeUrl(apiUrl.toString());

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS,
  );

  try {
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as {
      items?: Array<{
        snippet?: {
          title?: string;
          thumbnails?: Record<
            string,
            {
              url?: string;
              width?: number;
              height?: number;
            }
          >;
        };
      }>;
    };

    const snippet = json.items?.[0]?.snippet;

    if (!snippet || typeof snippet.title !== "string") {
      return null;
    }

    const title = snippet.title.trim();

    if (!title) {
      return null;
    }

    const thumbnails = Object.values(
      snippet.thumbnails ?? {},
    )
      .filter(
        (
          item,
        ): item is {
          url: string;
          width?: number;
          height?: number;
        } =>
          typeof item.url === "string" &&
          item.url.trim().length > 0,
      )
      .sort(
        (a, b) =>
          (b.width ?? 0) * (b.height ?? 0) -
          (a.width ?? 0) * (a.height ?? 0),
      );

    const imageCandidates = [
      ...new Set(
        thumbnails.map((item) => item.url.trim()),
      ),
    ];

    const thumbnailUrl = imageCandidates[0] ?? "";

    return {
      title,
      thumbnailUrl,
      imageCandidates,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
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

function isDmmUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();

  return (
    hostname === "dmm.co.jp" ||
    hostname.endsWith(".dmm.co.jp")
  );
}

export async function fetchPageMetadata(rawUrl: string, redirectCount = 0) {
  const initialUrl = await assertSafeUrl(rawUrl);

    const youtubeVideoId = getYouTubeVideoId(initialUrl);

  if (youtubeVideoId) {
    const youtubeMetadata =
      await fetchYouTubeMetadata(youtubeVideoId);

    if (youtubeMetadata) {
      return {
        finalUrl: initialUrl.toString(),
        title: youtubeMetadata.title.slice(0, 300),
        thumbnailUrl: youtubeMetadata.thumbnailUrl,
        imageCandidates: youtubeMetadata.imageCandidates,
      };
    }
  }
  const bilibiliBvid = getBilibiliBvid(initialUrl);

  if (bilibiliBvid) {
    const bilibiliMetadata =
      await fetchBilibiliMetadata(bilibiliBvid);

    if (bilibiliMetadata) {
      return {
        finalUrl: initialUrl.toString(),
        title: bilibiliMetadata.title.slice(0, 300),
        thumbnailUrl: bilibiliMetadata.thumbnailUrl,
        imageCandidates: [
          bilibiliMetadata.thumbnailUrl,
        ],
      };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "user-agent":
        "RandomLinkApp/0.1 (+personal bookmark preview)",
    };

    if (isDmmUrl(initialUrl)) {
      headers.cookie = "age_check_done=1";
    }

    const res = await fetch(initialUrl, {
      redirect: "manual",
      signal: controller.signal,
      headers,
    });

    // Redirect先も再検証してSSRFを防ぐ

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
