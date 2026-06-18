import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/use-clients";
import {
  useCredentials,
  useRestoreCredential,
  usePermanentDeleteCredential,
  useCredentialCategories,
} from "@/hooks/use-vault";
import { RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { DataPagination } from "@/components/data-pagination";
import { useState } from "react";

export default function TrashPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const limit = 15;
  const { data: credentialsData, isLoading } = useCredentials({ deleted: true, page, limit });
  const credentials = credentialsData?.data ?? [];
  const totalPages = Math.ceil((credentialsData?.total || 0) / limit);
  const { data: clientsData } = useClients();
  const clients = clientsData?.data;
  const { data: categories } = useCredentialCategories();

  const restoreMutation = useRestoreCredential();
  const permanentDeleteMutation = usePermanentDeleteCredential();

  const handleRestore = async (id: number) => {
    try {
      await restoreMutation.mutateAsync(id);
      toast({ title: "Restaurado", description: "Credencial restaurada com sucesso." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível restaurar.", variant: "destructive" });
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (confirm("ATENÇÃO: Esta ação não pode ser desfeita. Deseja excluir permanentemente?")) {
      try {
        await permanentDeleteMutation.mutateAsync(id);
        toast({ title: "Excluído", description: "Credencial removida permanentemente." });
      } catch {
        toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
      }
    }
  };

  const getClientName = (id: number) => clients?.find((c) => c.id === id)?.name || "-";
  const getCategoryName = (id: number | null) => categories?.find((c) => c.id === id)?.name || "-";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lixeira</h1>
            <p className="text-muted-foreground">Credenciais excluídas podem ser restauradas ou removidas permanentemente.</p>
          </div>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Excluído em</TableHead>
                <TableHead className="w-[180px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : credentials && credentials.length > 0 ? (
                credentials.map((cred) => (
                  <TableRow key={cred.id}>
                    <TableCell className="font-medium">{cred.title}</TableCell>
                    <TableCell>{getClientName(cred.clientId)}</TableCell>
                    <TableCell>{getCategoryName(cred.categoryId)}</TableCell>
                    <TableCell>{cred.deleteReason || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cred.deletedAt ? new Date(cred.deletedAt).toLocaleString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleRestore(cred.id)}>
                          <RotateCcw className="w-4 h-4 mr-1" /> Restaurar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handlePermanentDelete(cred.id)}>
                          <Trash2 className="w-4 h-4 mr-1" /> Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    A lixeira está vazia.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <DataPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </Layout>
  );
}
