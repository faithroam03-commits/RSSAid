
type GifDecoder = {
  completed: Promise<void>;
  tracks: {
    ready: Promise<void>;
    selectedTrack: {
      frameCount: number;
    } | null;
  };
  decode(options: {
    frameIndex: number;
  }): Promise<{ image: VideoFrame }>;
  close(): void;
};

type GifDecoderConstructor = {
  new (options: {
    data: ArrayBuffer;
    type: string;
  }): GifDecoder;
  isTypeSupported(type: string): Promise<boolean>;
};

export async function extractGifCheckFrames(
  dataUrl: string
): Promise<string[]> {
  const Decoder = (
    globalThis as typeof globalThis & {
      ImageDecoder?: GifDecoderConstructor;
    }
  ).ImageDecoder;

  if (
    !Decoder ||
    !(await Decoder.isTypeSupported("image/gif"))
  ) {
    throw new Error(
      "このブラウザはGIFのフレーム解析に対応していません。"
    );
  }

  const response = await fetch(dataUrl);
  const buffer = await response.arrayBuffer();

  const decoder = new Decoder({
    data: buffer,
    type: "image/gif",
  });

  try {
    await decoder.completed;
    await decoder.tracks.ready;

    const frameCount =
      decoder.tracks.selectedTrack?.frameCount ?? 0;

    if (frameCount < 1) {
      throw new Error(
        "GIFのフレームを取得できませんでした。"
      );
    }

    // 全体から最大5フレームを均等に抽出
    const sampleCount = Math.min(frameCount, 5);
    const indexes = Array.from(
      { length: sampleCount },
      (_, i) =>
        sampleCount === 1
          ? 0
          : Math.round(
              (i * (frameCount - 1)) /
                (sampleCount - 1)
            )
    );

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "画像の変換処理を開始できませんでした。"
      );
    }

    const frames: string[] = [];

    for (const index of indexes) {
      const { image } = await decoder.decode({
        frameIndex: index,
      });

      try {
        // Cloud Visionへの送信容量を抑える
        const scale = Math.min(
          1,
          768 /
            Math.max(
              image.displayWidth,
              image.displayHeight
            )
        );

        canvas.width = Math.max(
          1,
          Math.round(image.displayWidth * scale)
        );
        canvas.height = Math.max(
          1,
          Math.round(image.displayHeight * scale)
        );

        ctx.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        frames.push(
          canvas.toDataURL("image/jpeg", 0.7)
        );
      } finally {
        image.close();
      }
    }

    return frames;
  } finally {
    decoder.close();
  }
}
