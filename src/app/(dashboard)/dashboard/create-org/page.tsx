import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserOrganizations } from "@/features/organizations/server/organization.service";
import CreateOrgForm from "@/features/organizations/components/create-org-form";

export default async function CreateOrgPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgs = await getUserOrganizations(user.id);
  if (orgs.length > 0) {
    redirect(`/dashboard?org=${orgs[0].id}`);
  }

  return <CreateOrgForm />;
}
