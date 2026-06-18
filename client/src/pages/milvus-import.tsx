import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useMilvusSearch, useMilvusImport, useMilvusSync } from "@/hooks/use-milvus";
import { Search, Download, RefreshCw, CheckCircle, AlertCircle, Loader2, ArrowRight, Settings } from "lucide-react";
import { Link } from "wouter";

export default function MilvusImportPage() {
  const [documento, setDocumento] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [status, setStatus] = useState("1");
  const [searchEnabled, setSearchEnabled] = useState(false);

  const { data: results, isLoading, error } = useMilvusSearch(documento, nomeFantasia, status, searchEnabled);
  const importMutation = useMilvusImport();
  const syncMutation = useMilvusSync();

  const handleSearch = () => {
    setSearchEnabled(true);
  };

  const handleImport = (client: any) => {
    importMutation.mutate(client);
  };

  const handleSync = (milvusId: string) => {
    syncMutation.mutate(milvusId);
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Importar do Milvus</h1>
          <p className="text-muted-foreground mt-1">Busque e importe clientes da API Milvus.</p>
        </div>
      </div>

      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-blue-900">Importar todos os clientes de uma vez</p>
              <p className="text-sm text-blue-700">Sincronize todos os clientes do Milvus automaticamente.</p>
            </div>
          </div>
          <Link href="/settings/milvus">
            <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              Ir para Integração Milvus
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Documento (CPF/CNPJ)</label>
              <Input
                placeholder="59759145000108"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Nome Fantasia</label>
              <Input
                placeholder="Nome fantasia do cliente"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="1">Ativos</option>
                <option value="2">Bloqueados</option>
                <option value="3">Todos</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Buscar no Milvus
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Erro na busca</p>
            <p className="text-sm">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {results && results.length === 0 && searchEnabled && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum cliente encontrado no Milvus.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results?.map((client) => (
          <Card key={client.id} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">{client.razao_social || client.nome_fantasia}</h3>
                  {client._alreadyExists ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full mt-1">
                      <CheckCircle className="w-3 h-3" />
                      Já cadastrado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full mt-1">
                      Novo
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                {client.nome_fantasia && client.nome_fantasia !== client.razao_social && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground min-w-[100px]">Nome Fantasia:</span>
                    <span>{client.nome_fantasia}</span>
                  </div>
                )}
                {client.cnpj_cpf && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground min-w-[100px]">CPF/CNPJ:</span>
                    <span>{client.cnpj_cpf}</span>
                  </div>
                )}
                {client.site && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground min-w-[100px]">Site:</span>
                    <span className="truncate">{client.site}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground min-w-[100px]">Status:</span>
                  <span className={client.is_ativo !== false ? "text-green-600" : "text-red-600"}>
                    {client.is_ativo !== false ? "Ativo" : "Bloqueado"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {!client._alreadyExists ? (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleImport(client)}
                    disabled={importMutation.isPending}
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Importar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSync(String(client.id))}
                    disabled={syncMutation.isPending}
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Atualizar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
