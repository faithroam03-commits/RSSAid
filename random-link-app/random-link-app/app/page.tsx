import RandomCard from "@/components/RandomCard";
import { randomLink } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Home() {
  return <RandomCard item={randomLink()} />;
}
