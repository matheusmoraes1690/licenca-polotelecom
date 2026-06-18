import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Credential {
  id: number;
  clientId: number;
  categoryId: number | null;
  title: string;
  url: string | null;
  username: string | null;
  encryptedPassword: string | null;
  encryptedNotes: string | null;
  tags: string | null;
  status: string;
  responsibleId: number | null;
  deletedAt: Date | null;
  deletedBy: number | null;
  deleteReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialCategory {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
}

export interface CustomField {
  id?: number;
  name: string;
  value: string | null;
  isEncrypted: boolean;
  order: number;
}

export interface CredentialHistoryItem {
  id: number;
  credentialId: number;
  userId: number;
  action: string;
  changes: string;
  reason: string | null;
  createdAt: Date;
}

export function useCredentials(filters?: {
  clientId?: number;
  categoryId?: number;
  status?: string;
  search?: string;
  deleted?: boolean;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.clientId) params.set("clientId", String(filters.clientId));
  if (filters?.categoryId) params.set("categoryId", String(filters.categoryId));
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.deleted) params.set("deleted", "true");
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  return useQuery<{ data: Credential[]; total: number }>({
    queryKey: ["/api/credentials", filters],
    queryFn: async () => {
      const res = await fetch(`/api/credentials?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar credenciais");
      return res.json();
    },
  });
}

export function useCredential(id: number | null) {
  return useQuery<Credential>({
    queryKey: ["/api/credentials", id],
    queryFn: async () => {
      const res = await fetch(`/api/credentials/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar credencial");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCredentialCustomFields(credentialId: number | null) {
  return useQuery<CustomField[]>({
    queryKey: ["/api/credentials", credentialId, "custom-fields"],
    queryFn: async () => {
      const res = await fetch(`/api/credentials/${credentialId}/custom-fields`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar campos");
      return res.json();
    },
    enabled: !!credentialId,
  });
}

export function useCredentialHistory(credentialId: number | null) {
  return useQuery<CredentialHistoryItem[]>({
    queryKey: ["/api/credentials", credentialId, "history"],
    queryFn: async () => {
      const res = await fetch(`/api/credentials/${credentialId}/history`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar histórico");
      return res.json();
    },
    enabled: !!credentialId,
  });
}

export function useCreateCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar credencial");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/credentials"] }),
  });
}

export function useUpdateCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/credentials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar credencial");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credentials", vars.id] });
    },
  });
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const res = await fetch(`/api/credentials/${id}?${reason ? `reason=${encodeURIComponent(reason)}` : ""}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao excluir credencial");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/credentials"] }),
  });
}

export function useRestoreCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/credentials/${id}/restore`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Erro ao restaurar credencial");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/credentials"] }),
  });
}

export function usePermanentDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/credentials/${id}/permanent`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erro ao excluir permanentemente");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/credentials"] }),
  });
}

export function useRevealPassword() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/credentials/${id}/reveal`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Erro ${res.status} ao revelar senha`);
      }
      return res.json() as Promise<{ password: string }>;
    },
  });
}

export function useCopyPassword() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/credentials/${id}/copy-password`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Erro ${res.status} ao copiar senha`);
      }
      return res.json() as Promise<{ password: string }>;
    },
  });
}

export function useCredentialCategories() {
  return useQuery<CredentialCategory[]>({
    queryKey: ["/api/credential-categories"],
    queryFn: async () => {
      const res = await fetch("/api/credential-categories", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar categorias");
      return res.json();
    },
  });
}

export interface CredentialDocument {
  id: number;
  credentialId: number;
  name: string;
  type: 'file' | 'link';
  fileType: string | null;
  url: string;
  size: number | null;
  createdAt: Date;
}

export function useCredentialDocuments(credentialId: number) {
  return useQuery<CredentialDocument[]>({
    queryKey: ["/api/credentials", credentialId, "documents"],
    queryFn: async () => {
      const res = await fetch(`/api/credentials/${credentialId}/documents`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar documentos");
      return res.json();
    },
  });
}

export function useCreateCredentialDocument(credentialId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; type: 'file' | 'link'; fileType: string | null; url: string; size: number | null }) => {
      const res = await fetch(`/api/credentials/${credentialId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar documento");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/credentials", credentialId, "documents"] }),
  });
}

export function useDeleteCredentialDocument(credentialId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/credentials/${credentialId}/documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao excluir documento");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/credentials", credentialId, "documents"] }),
  });
}
