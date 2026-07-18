const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  events: "Events",
  new: "New Event",
  upload: "Upload CSV",
  issue: "Issue Certificates",
  certificates: "Certificates",
  templates: "Templates",
  users: "Users",
  my: "My Dashboard",
  profile: "Profile",
};

export function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const items: { label: string; href: string; isCurrent: boolean }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = segmentLabels[segment] ?? segment;
    items.push({ label, href, isCurrent: i === segments.length - 1 });
  }

  return items;
}
