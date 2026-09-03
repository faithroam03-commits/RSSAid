export type LinkRecord = {
  id: number;
  url: string;
  title: string;
  thumbnail_url: string | null;
  image_fit: "cover" | "contain";
  genre: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};
