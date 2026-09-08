"use client";

import { useEffect, useState } from "react";

import RegisterForm from "@/components/RegisterForm";
import { getClientGenres } from "@/lib/client-db";

type Props = {
  initialUrl: string;
};

export default function RegisterPageClient({
  initialUrl,
}: Props) {
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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
    <RegisterForm
      genres={genres}
      initialUrl={initialUrl}
    />
  );
}