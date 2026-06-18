import { useState } from "react";
import { Layout } from "@/components/layout";
import { useCredentials } from "@/hooks/use-vault";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, KeyRound } from "lucide-react";
import { Link } from "wouter";
import { DataPagination } from "@/components/data-pagination";

export default function CredentialsPage() {
  const [page, setPage] = useState(1);
  const limit = 15;
  const { data: credentialsData } = useCredentials({ page, limit });
  const credentials = credentialsData?.data ?? [];
  const totalPages = Math.ceil((credentialsData?.total || 0) / limit);
  const [search, setSearch] = useState("");

  const filtered = credentials.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.username?.toLowerCase().includes(search.toLowerCase()) ||
      c.url?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credenciais</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie senhas e acessos dos clientes.</p>
        </div>
        <Link href="/vault/new">
          <Button className="bg-polo-red hover:bg-polo-red-dark">
            <Plus className="w-4 h-4 mr-2" />
            Nova Credencial
          </Button>
        </Link>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar credenciais..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Título</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Usuário</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">URL</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cred) => (
              <tr key={cred.id} className="border-t border-border hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{cred.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{cred.username || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{cred.url || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={cred.status === "active" ? "default" : "secondary"}>{cred.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/vault/${cred.id}`}>
                    <Button variant="ghost" size="sm">
                      <KeyRound className="w-4 h-4" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma credencial encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <DataPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </Layout>
  );
}
