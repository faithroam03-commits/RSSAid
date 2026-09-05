import RegisterForm from "@/components/RegisterForm";
import { getGenres } from "@/lib/db";

export default async function RegisterPage({
  searchParams,
}: {

  searchParams: Promise<{
  url?: string;
  text?: string;
  title?: string;
}>;
  
}) {
  const params = await searchParams;
const genres = getGenres();

const sharedText = [
  params.url,
  params.text,
  params.title,
]
  .filter(Boolean)
  .join(" ");

const urlMatch = sharedText.match(/https?:\/\/[^\s]+/);
const initialUrl = urlMatch ? urlMatch[0] : "";

  return (
    <>
      <h1>新規URL登録</h1>
      <RegisterForm
        genres={genres}
        initialUrl={initialUrl}
      />
    </>
  );
}