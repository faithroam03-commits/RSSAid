const HASH_SIZE = 16;

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("画像を読み込めませんでした。"));

    img.src = src;
  });
}

async function createHash(src: string): Promise<Uint8Array> {
  const img = await loadImage(src);

  const canvas = document.createElement("canvas");
  canvas.width = HASH_SIZE;
  canvas.height = HASH_SIZE;

  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!ctx) {
    throw new Error("画像比較用Canvasを作成できません。");
  }

  ctx.drawImage(
    img,
    0,
    0,
    HASH_SIZE,
    HASH_SIZE,
  );

  const pixels = ctx.getImageData(
    0,
    0,
    HASH_SIZE,
    HASH_SIZE,
  ).data;

  const gray = new Uint8Array(
    HASH_SIZE * HASH_SIZE,
  );

  let total = 0;

  for (let i = 0; i < gray.length; i++) {
    const offset = i * 4;

    const value = Math.round(
      pixels[offset] * 0.299 +
        pixels[offset + 1] * 0.587 +
        pixels[offset + 2] * 0.114,
    );

    gray[i] = value;
    total += value;
  }

  const average = total / gray.length;

  const hash = new Uint8Array(gray.length);

  for (let i = 0; i < gray.length; i++) {
    hash[i] = gray[i] >= average ? 1 : 0;
  }

  return hash;
}

function hashDifference(
  a: Uint8Array,
  b: Uint8Array,
): number {
  if (a.length !== b.length) {
    return 1;
  }

  let different = 0;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      different++;
    }
  }

  return different / a.length;
}

export async function compareImages(
  firstSrc: string,
  secondSrc: string,
): Promise<number> {
  const [firstHash, secondHash] =
    await Promise.all([
      createHash(firstSrc),
      createHash(secondSrc),
    ]);

  return hashDifference(firstHash, secondHash);
}