import { NextResponse } from "next/server";
import { confirmEmail } from "@/features/auth/server/auth.actions";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (token) {
    const result = await confirmEmail(token);
    if (result.success) {
      return NextResponse.redirect(`${origin}/login?confirmed=true`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Confirmation+failed`);
}
