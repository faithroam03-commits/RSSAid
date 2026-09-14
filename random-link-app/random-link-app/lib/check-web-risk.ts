export async function checkWebRisk(url: string) {
  const apiKey = process.env.RL_API;

  if (!apiKey) {
    throw new Error("Web Risk APIキーが設定されていません。");
  }

  const params = new URLSearchParams();
  params.append("uri", url);
  params.append("threatTypes", "MALWARE");
  params.append("threatTypes", "SOCIAL_ENGINEERING");
  params.append("threatTypes", "UNWANTED_SOFTWARE");
  params.append("key", apiKey);

  const res = await fetch(
    `https://webrisk.googleapis.com/v1/uris:search?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error(`Web Risk APIの確認に失敗しました (${res.status})`);
  }

  const data = await res.json() as {
    threat?: {
      threatTypes?: string[];
    };
  };

  return {
    safe: !data.threat,
    threatTypes: data.threat?.threatTypes ?? [],
  };
}
