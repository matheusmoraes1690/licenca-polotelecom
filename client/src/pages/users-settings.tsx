import { useState } from "react";
import { Layout } from "@/components/layout";
import { useUsers, useUpdateUser } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCog, Save, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UsersSettingsPage() {
  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Record<number, { name: string; role: string; status: string }>>({});

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

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie usuários, funções e status.</p>
        </div>
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
    </Layout>
  );
}
