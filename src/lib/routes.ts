const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  events: "Events",
  upload: "Upload CSV",
  issue: "Issue Certificates",
  certificates: "Certificates",
  emails: "Emails",
  templates: "Templates",
  users: "Users",
  my: "My Dashboard",
  profile: "Profile",
};

const newLabels: Record<string, string> = {
  events: "New Event",
  certificates: "New Certificate",
  emails: "New Email Template",
  "auth-emails": "New Auth Template",
};

function isUuid(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
}

export function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const items: { label: string; href: string; isCurrent: boolean }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (isUuid(segment)) continue;

    let label: string;
    if (segment === "new") {
      const parent = segments[i - 1];
      label = newLabels[parent] ?? "New";
    } else {
      label = segmentLabels[segment] ?? segment;
    }

    const href = "/" + segments.slice(0, i + 1).join("/");
    items.push({ label, href, isCurrent: i === segments.length - 1 });
  }

  return items;
}
