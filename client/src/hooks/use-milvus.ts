import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const MILVUS_SEARCH_PATH = "/api/integrations/milvus/clients/search";
const MILVUS_IMPORT_PATH = "/api/integrations/milvus/clients/import";

export interface MilvusClientResult {
  id: number;
  razao_social: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  site?: string;
  is_ativo?: boolean;
  _localClientId: number | null;
  _alreadyExists: boolean;
}

export function useMilvusSearch(documento: string, nomeFantasia: string, status: string, enabled: boolean) {
  return useQuery({
    queryKey: [MILVUS_SEARCH_PATH, documento, nomeFantasia, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (documento) params.append("documento", documento);
      if (nomeFantasia) params.append("nome_fantasia", nomeFantasia);
      if (status) params.append("status", status);

      const url = `${MILVUS_SEARCH_PATH}?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao buscar no Milvus");
      }
      return res.json() as Promise<MilvusClientResult[]>;
    },
    enabled,
    retry: false,
  });
}

export function useMilvusImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (client: any) => {
      const res = await fetch(MILVUS_IMPORT_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(client),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao importar cliente");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: [MILVUS_SEARCH_PATH] });
      toast({ title: "Sucesso", description: "Cliente importado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useMilvusSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (milvusId: string) => {
      const res = await fetch(`/api/integrations/milvus/clients/sync/${encodeURIComponent(milvusId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao sincronizar cliente");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: [MILVUS_SEARCH_PATH] });
      toast({ title: "Sucesso", description: "Cliente sincronizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
