import { useQuery } from "@tanstack/react-query";

export interface AuditLog {
  id: number;
  userId: number | null;
  userName: string | null;
  clientId: number | null;
  credentialId: number | null;
  entity: string | null;
  entityId: number | null;
  action: string;
  resource: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  snapshot: string | null;
  createdAt: Date;
}

export function useAuditLogs(page?: number, limit?: number) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));

  return useQuery<{ data: AuditLog[]; total: number }>({
    queryKey: ["/api/audit-logs", page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar logs");
      return res.json();
    },
  });
}
