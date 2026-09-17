type SafeSearchLikelihood =
  | "UNKNOWN"
  | "VERY_UNLIKELY"
  | "UNLIKELY"
  | "POSSIBLE"
  | "LIKELY"
  | "VERY_LIKELY";

export type SafeSearchResult = {
  adult: SafeSearchLikelihood;
  racy: SafeSearchLikelihood;
  violence: SafeSearchLikelihood;
  medical: SafeSearchLikelihood;
  spoof: SafeSearchLikelihood;
  r18: boolean;
  violent: boolean;
};

export async function checkSafeSearch(
  imageUrl: string,
): Promise<SafeSearchResult> {
  const apiKey = process.env.RL_VISION_API;

  if (!apiKey) {
    throw new Error("Cloud Vision APIキーが設定されていません。");
  }

    let image: {
    source?: { imageUri: string };
    content?: string;
  };

  if (imageUrl.startsWith("data:image/")) {
    const match = imageUrl.match(
      /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/
    );

    if (!match) {
      throw new Error("画像データの形式が正しくありません。");
    }

    image = {
      content: match[1],
    };
  } else if (
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("http://")
  ) {
    image = {
      source: {
        imageUri: imageUrl,
      },
    };
  } else {
    throw new Error("対応していない画像URL形式です。");
  }
  
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(
      apiKey,
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image,
            features: [
              {
                type: "SAFE_SEARCH_DETECTION",
              },
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Cloud Vision APIの確認に失敗しました (${res.status})`);
  }

  const data = (await res.json()) as {
    responses?: Array<{
      safeSearchAnnotation?: {
        adult?: SafeSearchLikelihood;
        racy?: SafeSearchLikelihood;
        violence?: SafeSearchLikelihood;
        medical?: SafeSearchLikelihood;
        spoof?: SafeSearchLikelihood;
      };
      error?: {
        message?: string;
      };
    }>;
  };

  const response = data.responses?.[0];

  if (response?.error) {
    throw new Error(
      response.error.message ||
        "Cloud Vision APIで画像を確認できませんでした。",
    );
  }

  const safe = response?.safeSearchAnnotation;

  if (!safe) {
    throw new Error("SafeSearchの判定結果を取得できませんでした。");
  }

  const adult = safe.adult ?? "UNKNOWN";
  const racy = safe.racy ?? "UNKNOWN";
  const violence = safe.violence ?? "UNKNOWN";
  const medical = safe.medical ?? "UNKNOWN";
  const spoof = safe.spoof ?? "UNKNOWN";

  return {
    adult,
    racy,
    violence,
    medical,
    spoof,

    // R-18：
    // adult は LIKELY 以上、
    // racy は VERY_LIKELY の場合に警告対象
    r18:
      adult === "LIKELY" || adult === "VERY_LIKELY" || racy === "VERY_LIKELY",

    // 暴力表現：
    // violence は LIKELY 以上の場合に警告対象
    violent: violence === "LIKELY" || violence === "VERY_LIKELY",
  };
}
