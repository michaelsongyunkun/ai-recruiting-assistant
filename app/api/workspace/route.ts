import { NextResponse } from "next/server";
import { createRecruitingStore } from "../../../lib/server/recruiting-store.js";

export async function GET() {
  const store = createRecruitingStore();

  return NextResponse.json({
    ok: true,
    snapshot: await store.getPublicSnapshot()
  });
}
