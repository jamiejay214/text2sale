import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "SMS provider not configured yet.",
    },
    { status: 501 }
  );
}