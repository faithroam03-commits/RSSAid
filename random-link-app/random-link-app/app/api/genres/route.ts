import { NextResponse } from "next/server";
import {
  addGenre,
  deleteGenre,
  reorderGenres,
} from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "add") {
    addGenre(body.name);
  }

  if (body.action === "delete") {
    deleteGenre(body.name);
  }

  if (body.action === "reorder") {
    reorderGenres(body.names);
  }

  return NextResponse.json({ ok: true });
}