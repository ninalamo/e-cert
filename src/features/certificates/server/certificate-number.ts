import { supabaseAdmin } from "@/lib/supabase/admin";

export async function generateCertificateNumber(organizationId: string): Promise<string> {
  const { count, error } = await supabaseAdmin
    .from("certificates")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error("Failed to generate certificate number");
  }

  const nextNumber = (count ?? 0) + 1;
  const padded = String(nextNumber).padStart(6, "0");

  return `CERT-${padded}`;
}
