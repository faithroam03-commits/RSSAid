"use client";

import { useEffect, useState } from "react";

import MediaRegisterForm from "@/components/MediaRegisterForm";
import RegisterForm from "@/components/RegisterForm";
import { getClientGenres } from "@/lib/client-db";

type Props = {
  initialUrl: string;
  initialTitle?: string;
};

type RegisterTab = "url" | "media";

export default function RegisterPageClient({
  initialUrl,
  initialTitle = "",
}: Props) {
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
const [registerTab, setRegisterTab] =
  useState<RegisterTab>("url");

useEffect(() => {
  const params = new URLSearchParams(
    window.location.search
  );

  if (params.get("shared") === "image") {
    setRegisterTab("media");
  }
}, []);

  useEffect(() => {
    async function load() {
      const genreItems = await getClientGenres();

      setGenres(genreItems);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          className={`btn ${
            registerTab === "url" ? "primary" : ""
          }`}
          onClick={() => setRegisterTab("url")}
        >
          URL登録
        </button>

        <button
          type="button"
          className={`btn ${
            registerTab === "media" ? "primary" : ""
          }`}
          onClick={() => setRegisterTab("media")}
        >
          端末画像登録
        </button>
      </div>

      {registerTab === "url" ? (
        <RegisterForm
          genres={genres}
          initialUrl={initialUrl}
          initialTitle={initialTitle}
        />
      ) : (
        <MediaRegisterForm genres={genres} />
      )}
    </>
  );
}