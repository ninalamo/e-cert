import { redirect } from "next/navigation";
import { getCurrentSession, getHomePathForRole } from "@/lib/permissions";

export default async function Home() {
  const session = await getCurrentSession();
  if (session) {
    redirect(getHomePathForRole(session.role));
  }
  redirect("/login");
}
