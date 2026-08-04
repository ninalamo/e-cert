import { NextRequest, NextResponse } from "next/server";
import { autoRevokeExpiredCertificates } from "@/features/certificates/server/certificate.service";
import { getExpiringCertificates } from "@/features/certificates/server/certificate.service";
import { requireRole } from "@/lib/permissions";

const EXPIRY_NOTIFICATION_DAYS = 30;

export async function POST(_request: NextRequest) {
  const session = await requireRole(["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { revoked } = await autoRevokeExpiredCertificates();

  const expiring = await getExpiringCertificates(EXPIRY_NOTIFICATION_DAYS);
  if (expiring.length > 0) {
    const { sendExpiryNotification } = await import("@/features/certificates/server/certificate-email.service");
    await sendExpiryNotification(expiring, session.id).catch((err) => {
      console.error("[expire] Failed to send expiry notification:", err);
    });
  }

  return NextResponse.json({
    revoked,
    expiringCount: expiring.length,
    error: null,
  });
}