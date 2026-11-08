export type LinkRecord = {
  id: number;
  url: string;
  title: string;
  thumbnail_url: string | null;
  image_fit: "cover" | "contain";
  media_id?: number | null;
  genre: string;
enabled: number;
show_in_all?: number;
show_in_genre?: number;
created_at: string;
updated_at: string;
};
