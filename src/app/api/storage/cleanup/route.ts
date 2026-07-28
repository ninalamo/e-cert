import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/permissions";

const BUCKET = "certificates";

export async function DELETE() {
  const session = await requireRole(["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(BUCKET)
    .list("", { limit: 1000 });

  if (listError) {
    return NextResponse.json({ error: `Failed to list storage: ${listError.message}` }, { status: 500 });
  }

  if (!files || files.length === 0) {
    return NextResponse.json({ removed: 0, checked: 0 });
  }

  const { data: certs } = await supabaseAdmin
    .from("certificates")
    .select("file_path")
    .not("file_path", "is", null);

  const activePaths = new Set((certs ?? []).map((c) => c.file_path).filter(Boolean));

  const toRemove: string[] = [];
  for (const file of files) {
    const filePath = `${file.name}`;
    if (!activePaths.has(filePath)) {
      toRemove.push(filePath);
    }
  }

  let removed = 0;
  if (toRemove.length > 0) {
    const { error: removeError } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove(toRemove);

    if (removeError) {
      return NextResponse.json({ error: `Failed to remove files: ${removeError.message}` }, { status: 500 });
    }
    removed = toRemove.length;
  }

  return NextResponse.json({ removed, checked: files.length });
}
