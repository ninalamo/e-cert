"use client";

import { useState, useCallback } from "react";
import { getOrganizationMembersAction, removeMemberAction } from "../server/organization.actions";
import { getCurrentUser } from "@/features/auth/server/auth.actions";
import { ORG_ID } from "@/lib/org";

interface Member {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string;
}

export default function MembersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const [membersData, user] = await Promise.all([
      getOrganizationMembersAction(ORG_ID),
      getCurrentUser(),
    ]);
    setMembers(membersData as Member[]);
    setCurrentUserId(user?.id ?? null);
    setLoaded(true);
    setLoading(false);
  }, []);

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member?")) return;
    const result = await removeMemberAction(ORG_ID, memberId);
    if (result?.error) {
      alert(result.error);
    } else {
      loadMembers();
    }
  }

  return (
    <div className="space-y-6">
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
        <div className="tbl-container">
          <table className="tbl">
            <thead>
              <tr>
                <th className="text-left">User ID</th>
                <th className="text-left">Role</th>
                <th className="text-left">Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="font-mono text-xs">
                    {member.user_id.slice(0, 8)}...
                  </td>
                  <td>
                    <span className="status-pill status-draft">
                      {member.role}
                    </span>
                  </td>
                  <td className="text-tertiary">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    {member.user_id !== currentUserId && member.role !== "OWNER" && (
                      <button
                        onClick={() => handleRemove(member.user_id)}
                        className="text-xs text-danger hover:underline"
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
