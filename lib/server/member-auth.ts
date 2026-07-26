export type AuthenticatedMember = {
  memberId: string;
  relationshipId: string;
  role: "first" | "second";
  displayName: string;
};

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function authenticateMember(
  request: Request,
  database: D1Database,
): Promise<AuthenticatedMember | null> {
  const memberToken =
    request.headers.get("x-member-token")?.trim();

  if (
    !memberToken ||
    memberToken.length < 32 ||
    memberToken.length > 256
  ) {
    return null;
  }

  const tokenHash = await sha256(memberToken);

  return database
    .prepare(
      `SELECT
        relationship_members.id AS memberId,
        relationship_members.relationship_id AS relationshipId,
        relationship_members.role,
        relationship_members.display_name AS displayName

      FROM relationship_members

      WHERE
        relationship_members.member_token_hash = ?

        OR EXISTS (
          SELECT 1
          FROM member_sessions
          WHERE member_sessions.member_id =
                relationship_members.id
            AND member_sessions.token_hash = ?
            AND member_sessions.revoked_at IS NULL
        )

      LIMIT 1`,
    )
    .bind(tokenHash, tokenHash)
    .first<AuthenticatedMember>();
}
