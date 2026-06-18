import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/use-clients";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useCredentials,
  useCredentialCategories,
  useDeleteCredential,
  useCopyPassword,
  useRevealPassword,
} from "@/hooks/use-vault";
import {
  Search,
  Plus,
  Eye,
  Copy,
  ExternalLink,
  MoreVertical,
  Pencil,
  Trash2,
  KeyRound,
  Shield,
  Filter,
  X,
} from "lucide-react";
import { DataPagination } from "@/components/data-pagination";

export default function VaultPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data: credentialsData } = useCredentials({
    clientId: clientFilter !== "all" && clientFilter ? Number(clientFilter) : undefined,
    categoryId: categoryFilter !== "all" && categoryFilter ? Number(categoryFilter) : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
    page,
    limit,
  });
  const credentials = credentialsData?.data ?? [];
  const totalPages = Math.ceil((credentialsData?.total || 0) / limit);

  const { data: clientsData } = useClients();
  const clients = clientsData?.data;
  const { data: categories } = useCredentialCategories();

  const deleteMutation = useDeleteCredential();
  const copyMutation = useCopyPassword();
  const revealMutation = useRevealPassword();

  const handleCopyPassword = async (id: number) => {
    try {
      const result = await copyMutation.mutateAsync(id);
      await navigator.clipboard.writeText(result.password);
      toast({ title: "Senha copiada", description: "A senha foi copiada para a área de transferência." });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Não foi possível copiar a senha.", variant: "destructive" });
    }
  };

  const handleRevealPassword = async (id: number) => {
    try {
      const result = await revealMutation.mutateAsync(id);
      setRevealedPassword(result.password);
      setShowPasswordDialog(true);
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Não foi possível revelar a senha.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta credencial?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Excluído", description: "Credencial movida para a lixeira." });
      } catch {
        toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
      }
    }
  };

  const openUrl = (url: string | null) => {
    if (!url) return;
    const target = url.startsWith("http") ? url : `https://${url}`;
    window.open(target, "_blank");
  };

  const getCategoryName = (id: number | null) => {
    if (!id || !categories) return "-";
    return categories.find((c) => c.id === id)?.name || "-";
  };

  const getClientName = (id: number) => {
    if (!clients) return "-";
    return clients.find((c) => c.id === id)?.name || "-";
  };

  const clearFilters = () => {
    setClientFilter("");
    setCategoryFilter("");
    setStatusFilter("");
    setSearch("");
  };

  const hasActiveFilters = clientFilter || categoryFilter || statusFilter || search;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cofre de Senhas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie credenciais e acessos de forma segura.
            </p>
          </div>
          <Button onClick={() => setLocation("/vault/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Credencial
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, usuário, URL, tags..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4" />
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-48">
                <label className="text-xs font-medium mb-1 block">Cliente</label>
                <SearchableSelect
                  options={[
                    { value: "all", label: "Todos" },
                    ...(clients?.map((c) => ({ value: String(c.id), label: c.name })) || []),
                  ]}
                  value={clientFilter || "all"}
                  onChange={setClientFilter}
                  placeholder="Todos"
                  searchPlaceholder="Buscar cliente..."
                />
              </div>
              <div className="w-48">
                <label className="text-xs font-medium mb-1 block">Categoria</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <label className="text-xs font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{credentials?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Credenciais</p>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {credentials?.filter((c) => c.status === "active").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Ativas</p>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {credentials?.filter((c) => c.status === "inactive").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Inativas</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Senha</TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentials && credentials.length > 0 ? (
                credentials.map((cred) => (
                  <TableRow key={cred.id} className="group">
                    <TableCell className="font-medium">{cred.title}</TableCell>
                    <TableCell>{getClientName(cred.clientId)}</TableCell>
                    <TableCell>{getCategoryName(cred.categoryId)}</TableCell>
                    <TableCell>
                      {cred.username ? (
                        <button
                          className="flex items-center gap-1 text-primary hover:underline"
                          onClick={() => {
                            navigator.clipboard.writeText(cred.username || "");
                            toast({ title: "Usuário copiado" });
                          }}
                        >
                          {cred.username}
                          <Copy className="w-3 h-3" />
                        </button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {cred.url ? (
                        <button
                          className="flex items-center gap-1 text-primary hover:underline"
                          onClick={() => openUrl(cred.url)}
                        >
                          {cred.url.length > 25 ? cred.url.substring(0, 25) + "..." : cred.url}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cred.status === "active" ? "default" : "secondary"}>
                        {cred.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Copiar senha" onClick={() => handleCopyPassword(cred.id)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Revelar senha" onClick={() => handleRevealPassword(cred.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/vault/${cred.id}`)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(cred.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Nenhuma credencial encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <DataPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* Reveal Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha Revelada</DialogTitle>
            <DialogDescription>
              A senha será ocultada quando esta janela for fechada.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg font-mono text-lg break-all">
            {revealedPassword}
          </div>
          <div className="flex gap-2">
            <Button
              className="w-full"
              onClick={() => {
                if (revealedPassword) navigator.clipboard.writeText(revealedPassword);
                toast({ title: "Senha copiada" });
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
