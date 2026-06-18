import { useState } from "react";
import { Layout } from "@/components/layout";
import { useUsers, useUpdateUser, useCreateUser } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserCog, Save, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UsersSettingsPage() {
  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Record<number, { name: string; role: string; status: string }>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "viewer",
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Layout>
    );
  }

  const handleChange = (id: number, field: string, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...{ [field]: value } },
    }));
  };

  const handleSave = (id: number) => {
    const data = editing[id];
    if (!data) return;
    updateUser.mutate({ id, data });
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleCreate = () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      toast({ title: "Erro", description: "Preencha nome, usuário e senha.", variant: "destructive" });
      return;
    }
    if (newUser.password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter ao menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    createUser.mutate(
      {
        name: newUser.name,
        username: newUser.username,
        email: newUser.email || undefined,
        password: newUser.password,
        role: newUser.role,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewUser({ name: "", username: "", email: "", password: "", confirmPassword: "", role: "viewer" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie usuários, funções e status.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-polo-red hover:bg-polo-red-dark">
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Usuário</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Função</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((user) => (
              <tr key={user.id} className="border-t border-border hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Input
                    defaultValue={user.name}
                    onChange={(e) => handleChange(user.id, "name", e.target.value)}
                    className="h-8 text-sm"
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.username}</td>
                <td className="px-4 py-3">
                  <select
                    defaultValue={user.role}
                    onChange={(e) => handleChange(user.id, "role", e.target.value)}
                    className="h-8 px-2 rounded-md border border-input text-sm bg-background"
                  >
                    <option value="admin">Administrador</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {editing[user.id] && (
                    <Button size="sm" onClick={() => handleSave(user.id)} disabled={updateUser.isPending}>
                      <Save className="w-4 h-4 mr-1" />
                      Salvar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-polo-red" />
              Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="new-name">Nome</Label>
              <Input
                id="new-name"
                placeholder="Nome completo"
                value={newUser.name}
                onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-username">Usuário</Label>
              <Input
                id="new-username"
                placeholder="Nome de usuário"
                value={newUser.username}
                onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="email@exemplo.com"
                value={newUser.email}
                onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-role">Função</Label>
              <select
                id="new-role"
                value={newUser.role}
                onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
                className="h-9 w-full px-2 rounded-md border border-input text-sm bg-background"
              >
                <option value="admin">Administrador</option>
                <option value="editor">Editor</option>
                <option value="viewer">Visualizador</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-password">Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newUser.password}
                onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-confirm">Confirmar Senha</Label>
              <Input
                id="new-confirm"
                type="password"
                placeholder="Repita a senha"
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createUser.isPending} className="bg-polo-red hover:bg-polo-red-dark">
              {createUser.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
