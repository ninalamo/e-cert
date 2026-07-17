import MembersList from "@/features/organizations/components/members-list";

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Members</h1>
        <p className="text-muted-foreground text-sm">
          Manage your organization members
        </p>
      </div>
      <MembersList />
    </div>
  );
}

