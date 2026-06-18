import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const MILVUS_IMPORT_ALL_PATH = "/api/integrations/milvus/clients/import-all";
const MILVUS_TEST_PATH = "/api/integrations/milvus/clients/search";

export interface ImportAllSummary {
  totalFromMilvus: number;
  created: number;
  updated: number;
  skipped: number;
  conflicts: number;
  errors: number;
  details: Array<{
    milvusId?: string;
    name?: string;
    action: string;
    localId?: number;
    matchedBy?: string;
    reason?: string;
  }>;
}

export function useMilvusTestConnection() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${MILVUS_TEST_PATH}?status=3`, {
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Falha ao conectar com Milvus");
      }
      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Conexão com Milvus estabelecida." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro de conexão", description: error.message, variant: "destructive" });
    },
  });
}

export function useMilvusImportAll() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (dryRun: boolean): Promise<ImportAllSummary> => {
      const res = await fetch(`${MILVUS_IMPORT_ALL_PATH}?dryRun=${dryRun}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro na importação");
      }
      return res.json();
    },
    onSuccess: (data, dryRun) => {
      if (dryRun) {
        toast({ title: "Simulação concluída", description: `${data.totalFromMilvus} clientes analisados.` });
      } else {
        toast({
          title: "Importação concluída",
          description: `${data.created} criados, ${data.updated} atualizados, ${data.conflicts} conflitos, ${data.errors} erros.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
