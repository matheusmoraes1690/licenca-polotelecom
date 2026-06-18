import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMilvusTestConnection, useMilvusImportAll } from "@/hooks/use-milvus-import-all";
import { Activity, Download, Play, RefreshCw, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function MilvusSettingsPage() {
  const [lastResult, setLastResult] = useState<ReturnType<typeof useMilvusImportAll>["data"]>(undefined);

  const testConnection = useMilvusTestConnection();
  const importAll = useMilvusImportAll();

  const handleSimulate = async () => {
    const result = await importAll.mutateAsync(true);
    setLastResult(result);
  };

  const handleImport = async () => {
    const result = await importAll.mutateAsync(false);
    setLastResult(result);
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Integração Milvus</h1>
          <p className="text-muted-foreground mt-1">Sincronize clientes entre o Milvus e o sistema local.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Testar Conexão</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Verifique se a API do Milvus está acessível com o token configurado.
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => testConnection.mutate()}
              disabled={testConnection.isPending}
            >
              {testConnection.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Activity className="w-4 h-4 mr-2" />
              )}
              Testar Conexão
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Simular Importação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Veja quantos clientes seriam criados, atualizados ou conflitantes sem gravar no banco.
            </p>
            <Button
              className="w-full"
              variant="secondary"
              onClick={handleSimulate}
              disabled={importAll.isPending}
            >
              {importAll.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Simular
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Importar Todos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Execute a sincronização completa: criar ausentes e atualizar existentes.
            </p>
            <Button
              className="w-full"
              onClick={handleImport}
              disabled={importAll.isPending}
            >
              {importAll.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Importar Todos
            </Button>
          </CardContent>
        </Card>
      </div>

      {lastResult && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Resultado da Operação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-2xl font-bold">{lastResult.totalFromMilvus}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Milvus</div>
              </div>
              <div className="p-4 rounded-lg bg-green-50 text-center">
                <div className="text-2xl font-bold text-green-600">{lastResult.created}</div>
                <div className="text-xs text-green-700 mt-1">Criados</div>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 text-center">
                <div className="text-2xl font-bold text-blue-600">{lastResult.updated}</div>
                <div className="text-xs text-blue-700 mt-1">Atualizados</div>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 text-center">
                <div className="text-2xl font-bold text-amber-600">{lastResult.conflicts}</div>
                <div className="text-xs text-amber-700 mt-1">Conflitos</div>
              </div>
              <div className="p-4 rounded-lg bg-red-50 text-center">
                <div className="text-2xl font-bold text-red-600">{lastResult.errors}</div>
                <div className="text-xs text-red-700 mt-1">Erros</div>
              </div>
            </div>

            {lastResult.details.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Detalhes</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Ação</th>
                          <th className="px-4 py-2 text-left font-medium">Nome</th>
                          <th className="px-4 py-2 text-left font-medium">Milvus ID</th>
                          <th className="px-4 py-2 text-left font-medium">Info</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {lastResult.details.slice(0, 50).map((item, i) => (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center gap-1">
                                {item.action === "created" && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                                {item.action === "updated" && <RefreshCw className="w-3.5 h-3.5 text-blue-600" />}
                                {item.action === "conflict" && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                                {item.action === "error" && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                                <span className="capitalize">{item.action}</span>
                              </span>
                            </td>
                            <td className="px-4 py-2">{item.name || "—"}</td>
                            <td className="px-4 py-2 font-mono text-xs">{item.milvusId || "—"}</td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {item.matchedBy && `Por: ${item.matchedBy}`}
                              {item.localId && `Local #${item.localId}`}
                              {item.reason && item.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {lastResult.details.length > 50 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground text-center">
                        Mostrando 50 de {lastResult.details.length} registros.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}
