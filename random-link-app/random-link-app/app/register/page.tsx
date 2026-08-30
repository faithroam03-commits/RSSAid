import RegisterForm from "@/components/RegisterForm";
import { getGenres } from "@/lib/db";

export default function RegisterPage() {
  
  const genres = getGenres();
  
  return (
    <>
      <h1>URL登録</h1>
      <RegisterForm genres={genres} />
    </>
  );
}
