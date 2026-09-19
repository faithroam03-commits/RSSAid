type SafeSearchLikelihood =
  | "UNKNOWN"
  | "VERY_UNLIKELY"
  | "UNLIKELY"
  | "POSSIBLE"
  | "LIKELY"
  | "VERY_LIKELY";

type LabelAnnotation = {
  description?: string;
  score?: number;
};

export type SafeSearchResult = {
  adult: SafeSearchLikelihood;
  racy: SafeSearchLikelihood;
  violence: SafeSearchLikelihood;
  medical: SafeSearchLikelihood;
  spoof: SafeSearchLikelihood;
  r18: boolean;
  violent: boolean;
  bug: boolean;
};

const BUG_LABELS = new Set([
  "spider",
  "arachnid",
  "centipede",
  "centipedes",
  "millipede",
  "millipedes",
  "cockroach",
  "oriental cockroach",
  "caterpillar",
  "larva",
  "maggot",
  "maggots",
  "cicada",
]);

function isBugLabel(label: LabelAnnotation): boolean {
  const description = label.description?.trim().toLowerCase();
  const score = label.score ?? 0;

  if (!description) {
    return false;
  }

  // 今回の実測結果を基準に、
  // Insect は 0.70 以上で虫として判定する。
  if (description === "insect" && score >= 0.7) {
    return true;
  }

  // 虫系の固有ラベルも補助判定として使用する。
  // Arthropod 単独では判定しない。
  return BUG_LABELS.has(description) && score >= 0.5;
}

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
      /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/,
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
              {
                type: "LABEL_DETECTION",
                maxResults: 20,
              },
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    throw new Error(
      `Cloud Vision APIの確認に失敗しました (${res.status})`,
    );
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
      labelAnnotations?: LabelAnnotation[];
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

  const labels = response?.labelAnnotations ?? [];
  const bug = labels.some(isBugLabel);

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
      adult === "LIKELY" ||
      adult === "VERY_LIKELY" ||
      racy === "VERY_LIKELY",

    // 暴力表現：
    // violence は LIKELY 以上の場合に警告対象
    violent:
      violence === "LIKELY" ||
      violence === "VERY_LIKELY",

    // 虫：
    // Insect または虫系の固有ラベルから判定
    bug,
  };
}