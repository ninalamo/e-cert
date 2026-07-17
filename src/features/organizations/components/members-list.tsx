"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getOrganizationMembersAction, removeMemberAction } from "../server/organization.actions";
import { getCurrentUser } from "@/features/auth/server/auth.actions";
import InviteMemberForm from "../components/invite-member-form";
import { Suspense } from "react";

interface Member {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string;
}

function MembersListInner() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [membersData, user] = await Promise.all([
      getOrganizationMembersAction(orgId),
      getCurrentUser(),
    ]);
    setMembers(membersData as Member[]);
    setCurrentUserId(user?.id ?? null);
    setLoaded(true);
    setLoading(false);
  }, [orgId]);

  async function handleRemove(memberId: string) {
    if (!orgId) return;
    if (!confirm("Remove this member?")) return;
    const result = await removeMemberAction(orgId, memberId);
    if (result?.error) {
      alert(result.error);
    } else {
      loadMembers();
    }
  }

  if (!orgId) {
    return <p className="text-muted-foreground">Select an organization first.</p>;
  }

  return (
    <div className="space-y-6">
      <InviteMemberForm organizationId={orgId} onInvited={loadMembers} />

      {!loaded && !loading && (
        <button onClick={loadMembers} className="text-sm text-blue-600 hover:underline">
          Load members
        </button>
      )}

      {loading && (
        <p className="text-muted-foreground text-sm">Loading members...</p>
      )}

      {!loading && loaded && members.length === 0 && (
        <p className="text-muted-foreground text-sm">No members found.</p>
      )}

      {!loading && loaded && members.length > 0 && (
        <div className="border rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-2 text-left">User ID</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Joined</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">
                    {member.user_id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {member.user_id !== currentUserId && member.role !== "OWNER" && (
                      <button
                        onClick={() => handleRemove(member.user_id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MembersList() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
      <MembersListInner />
    </Suspense>
  );
}
