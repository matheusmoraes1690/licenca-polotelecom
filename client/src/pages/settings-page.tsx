import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useSystemSetting, useUpdateSystemSetting } from "@/hooks/use-settings";
import { useUsers, useUpdateUser, useCreateUser, useAdminResetPassword, useChangePassword } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImagePlus, X, Save, UserCog, KeyRound, Lock, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function BrandingSettings() {
  const { data: brandingSetting } = useSystemSetting("branding");
  const updateSetting = useUpdateSystemSetting();
  const { toast } = useToast();
  const [sidebarLogo, setSidebarLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [loginHeroImage, setLoginHeroImage] = useState<string | null>(null);
  const [appName, setAppName] = useState<string>("Polo Telecom");

  useEffect(() => {
    if (brandingSetting?.value) {
      try {
        const parsed = JSON.parse(brandingSetting.value);
        setSidebarLogo(parsed.sidebarLogo || null);
        setFavicon(parsed.favicon || null);
        setLoginHeroImage(parsed.loginHeroImage || null);
        setAppName(parsed.appName || "Polo Telecom");
      } catch {
        // mantém defaults
      }
    }
  }, [brandingSetting?.value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erro", description: "Imagem muito grande. Máximo 2MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.onerror = () => toast({ title: "Erro", description: "Falha ao ler o arquivo.", variant: "destructive" });
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const value = JSON.stringify({ sidebarLogo, favicon, loginHeroImage, appName: appName || "Polo Telecom" });
    updateSetting.mutate({ key: "branding", value });
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ImagePlus className="w-5 h-5 text-polo-red" />
          Identidade Visual
        </CardTitle>
        <CardDescription>Altere as logos e o nome exibido no sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="app-name">Nome do Sistema</Label>
          <Input
            id="app-name"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Polo Telecom"
            className="border-border focus:border-primary focus:ring-primary/10"
          />
        </div>

        <div className="space-y-2">
          <Label>Logo da Sidebar</Label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-48 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
              {sidebarLogo ? (
                <img src={sidebarLogo} alt="Logo sidebar" className="h-full w-full object-contain p-2" />
              ) : (
                <span className="text-xs text-muted-foreground">Nenhuma logo</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer inline-flex">
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleFileChange(e, setSidebarLogo)} />
                <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-border bg-card hover:bg-accent hover:text-accent-foreground h-8 px-3">
                  <ImagePlus className="w-4 h-4 mr-1" />Selecionar
                </span>
              </label>
              {sidebarLogo && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSidebarLogo(null)} className="text-polo-red hover:text-polo-red-dark hover:bg-polo-red-light">
                  <X className="w-4 h-4 mr-1" />Remover
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Recomendado: fundo transparente (PNG), até 2MB.</p>
        </div>

        <div className="space-y-2">
          <Label>Favicon</Label>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
              {favicon ? (
                <img src={favicon} alt="Favicon" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-xs text-muted-foreground">Nenhum</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer inline-flex">
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleFileChange(e, setFavicon)} />
                <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-border bg-card hover:bg-accent hover:text-accent-foreground h-8 px-3">
                  <ImagePlus className="w-4 h-4 mr-1" />Selecionar
                </span>
              </label>
              {favicon && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setFavicon(null)} className="text-polo-red hover:text-polo-red-dark hover:bg-polo-red-light">
                  <X className="w-4 h-4 mr-1" />Remover
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Recomendado: 32x32px ou 64x64px, até 2MB.</p>
        </div>

        <div className="space-y-2">
          <Label>Imagem do Login (painel esquerdo)</Label>
          <div className="flex items-center gap-4">
            <div className="h-28 w-48 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
              {loginHeroImage ? (
                <img src={loginHeroImage} alt="Imagem login" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">Padrão (CSS)</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer inline-flex">
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleFileChange(e, setLoginHeroImage)} />
                <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-border bg-card hover:bg-accent hover:text-accent-foreground h-8 px-3">
                  <ImagePlus className="w-4 h-4 mr-1" />Selecionar
                </span>
              </label>
              {loginHeroImage && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setLoginHeroImage(null)} className="text-polo-red hover:text-polo-red-dark hover:bg-polo-red-light">
                  <X className="w-4 h-4 mr-1" />Remover
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Recomendado: proporção vertical, até 2MB. Deixe vazio para usar o design padrão.</p>
        </div>

        <div className="pt-2 flex justify-end">
          <Button onClick={handleSave} disabled={updateSetting.isPending} className="bg-polo-red hover:bg-polo-red-dark">
            <Save className="w-4 h-4 mr-2" />
            {updateSetting.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersSettings() {
  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const adminReset = useAdminResetPassword();
  const [editing, setEditing] = useState<Record<number, { name: string; role: string; status: string }>>({})
  const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: number; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", username: "", email: "", password: "", confirmPassword: "", role: "viewer" });
  const { toast } = useToast();

  const handleResetPassword = () => {
    if (!resetDialog) return;
    if (newPassword !== confirmPassword) { toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" }); return; }
    adminReset.mutate({ id: resetDialog.userId, newPassword }, {
      onSuccess: () => { setResetDialog(null); setNewPassword(""); setConfirmPassword(""); },
    });
  };

  const handleCreate = () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      toast({ title: "Erro", description: "Preencha nome, usuário e senha.", variant: "destructive" }); return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" }); return;
    }
    createUser.mutate(
      { name: newUser.name, username: newUser.username, email: newUser.email || undefined, password: newUser.password, role: newUser.role },
      { onSuccess: () => { setCreateOpen(false); setNewUser({ name: "", username: "", email: "", password: "", confirmPassword: "", role: "viewer" }); } }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const handleChange = (id: number, field: string, value: string) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = (id: number) => {
    const data = editing[id];
    if (!data) return;
    updateUser.mutate({ id, data });
    setEditing((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  return (
    <>
    <Card className="border-border shadow-sm overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <UserCog className="w-5 h-5 text-polo-red" />
              Usuários
            </CardTitle>
            <CardDescription>Gerencie usuários, funções e status.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-polo-red hover:bg-polo-red-dark">
            <UserPlus className="w-4 h-4 mr-1" />Novo Usuário
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
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
                  <Input defaultValue={user.name} onChange={(e) => handleChange(user.id, "name", e.target.value)} className="h-8 text-sm" />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.username}</td>
                <td className="px-4 py-3">
                  <select defaultValue={user.role} onChange={(e) => handleChange(user.id, "role", e.target.value)} className="h-8 px-2 rounded-md border border-input text-sm bg-background">
                    <option value="admin">Administrador</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setNewPassword(""); setConfirmPassword(""); setResetDialog({ open: true, userId: user.id, username: user.username }); }}>
                    <KeyRound className="w-3.5 h-3.5 mr-1" />Senha
                  </Button>
                  {editing[user.id] && (
                    <Button size="sm" onClick={() => handleSave(user.id)} disabled={updateUser.isPending}>
                      <Save className="w-4 h-4 mr-1" />Salvar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>

    <Dialog open={!!resetDialog?.open} onOpenChange={(open) => !open && setResetDialog(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-polo-red" />
            Redefinir senha — {resetDialog?.username}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="new-pw">Nova senha</Label>
            <Input id="new-pw" type="password" placeholder="Mínimo 10 caracteres, maiúscula, minúscula, número e especial" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-pw">Confirmar senha</Label>
            <Input id="confirm-pw" type="password" placeholder="Repita a nova senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setResetDialog(null)}>Cancelar</Button>
          <Button onClick={handleResetPassword} disabled={adminReset.isPending} className="bg-polo-red hover:bg-polo-red-dark">
            {adminReset.isPending ? "Salvando..." : "Redefinir Senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
            <Input id="new-name" placeholder="Nome completo" value={newUser.name} onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-username">Usuário</Label>
            <Input id="new-username" placeholder="Nome de usuário" value={newUser.username} onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-email">Email</Label>
            <Input id="new-email" type="email" placeholder="email@exemplo.com" value={newUser.email} onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-role">Função</Label>
            <select id="new-role" value={newUser.role} onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))} className="h-9 w-full px-2 rounded-md border border-input text-sm bg-background">
              <option value="admin">Administrador</option>
              <option value="editor">Editor</option>
              <option value="viewer">Visualizador</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-password">Senha</Label>
            <Input id="new-password" type="password" placeholder="Mínimo 10 caracteres, maiúscula, minúscula, número e especial" value={newUser.password} onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-confirm">Confirmar Senha</Label>
            <Input id="new-confirm" type="password" placeholder="Repita a senha" value={newUser.confirmPassword} onChange={(e) => setNewUser((prev) => ({ ...prev, confirmPassword: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={createUser.isPending} className="bg-polo-red hover:bg-polo-red-dark">
            {createUser.isPending ? "Criando..." : "Criar Usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function MyAccountSettings() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const changePassword = useChangePassword();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" }); return; }
    changePassword.mutate({ currentPassword: currentPw, newPassword: newPw }, {
      onSuccess: () => { setCurrentPw(""); setNewPw(""); setConfirmPw(""); },
    });
  };

  return (
    <Card className="border-border shadow-sm max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Lock className="w-5 h-5 text-polo-red" />
          Alterar Minha Senha
        </CardTitle>
        <CardDescription>Insira sua senha atual e escolha uma nova senha.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cur-pw">Senha atual</Label>
            <Input id="cur-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-pw2">Nova senha</Label>
            <Input id="new-pw2" type="password" placeholder="Mínimo 10 caracteres, maiúscula, minúscula, número e especial" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-pw2">Confirmar nova senha</Label>
            <Input id="confirm-pw2" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
          </div>
          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={changePassword.isPending} className="bg-polo-red hover:bg-polo-red-dark">
              <Save className="w-4 h-4 mr-2" />
              {changePassword.isPending ? "Salvando..." : "Alterar Senha"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie a aparência e os usuários do sistema.</p>
      </div>

      <Tabs defaultValue="branding" className="max-w-3xl">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="branding" className="data-[state=active]:bg-card data-[state=active]:text-accent data-[state=active]:shadow-sm">Identidade Visual</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-card data-[state=active]:text-accent data-[state=active]:shadow-sm">Usuários</TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-card data-[state=active]:text-accent data-[state=active]:shadow-sm">Minha Conta</TabsTrigger>
        </TabsList>
        <TabsContent value="branding" className="mt-4">
          <BrandingSettings />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersSettings />
        </TabsContent>
        <TabsContent value="account" className="mt-4">
          <MyAccountSettings />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
