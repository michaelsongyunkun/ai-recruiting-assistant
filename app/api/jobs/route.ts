import { NextResponse } from "next/server";
import { validateJobInput } from "../../../lib/domain/jobs.js";
import { createRecruitingStore } from "../../../lib/server/recruiting-store.js";

export async function GET() {
  const snapshot = await createRecruitingStore().getSnapshot();
  return NextResponse.json({ ok: true, jobs: snapshot.jobs });
}

export async function POST(request: Request) {
  const body = await request.json();
  const validation = validateJobInput(body);

  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "JOB_REQUIREMENTS_INCOMPLETE",
        message: validation.message
      },
      { status: 400 }
    );
  }

  const job = await createRecruitingStore().createJob(validation.job);

  return NextResponse.json({ ok: true, job });
}
