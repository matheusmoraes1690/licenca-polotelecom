import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ShieldCheck, Zap, KeyRound, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBrandingSettings } from "@/hooks/use-settings";
import { useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { useState } from "react";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const branding = useBrandingSettings();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({ newPassword: "", confirmPassword: "" });
  const [passwordChangeError, setPasswordChangeError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Credenciais inválidas");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.requirePasswordChange) {
        setRequirePasswordChange(true);
      } else {
        window.location.href = "/";
      }
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const forcePasswordChangeMutation = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const csrfRes = await fetch("/api/auth/csrf", { credentials: "include" });
      const { csrfToken } = await csrfRes.json();
      const response = await fetch("/api/auth/force-password-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ newPassword }),
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Erro ao alterar senha");
      }
      return response.json();
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error: Error) => {
      setPasswordChangeError(error.message);
    },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (user && !requirePasswordChange) {
    return <Redirect to="/" />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(loginData);
  };

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError("");
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setPasswordChangeError("As senhas não coincidem.");
      return;
    }
    forcePasswordChangeMutation.mutate({ newPassword: passwordChangeData.newPassword });
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Left Panel: Hero */}
      <div className="flex-1 lg:flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden bg-zinc-900 text-white">
        {/* Abstract Background Decoration */}
        {!branding.loginHeroImage && (
          <>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
          </>
        )}
        {branding.loginHeroImage ? (
          <img
            src={branding.loginHeroImage}
            alt="Login"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-12">
                <div className="h-10 w-10 rounded-xl bg-white text-zinc-900 flex items-center justify-center font-bold text-xl">
                  <KeyRound className="w-6 h-6" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight">{branding.appName || "Cofre de Senhas"}</span>
              </div>

              <h1 className="font-display text-4xl lg:text-6xl font-bold leading-[1.1] mb-6">
                Controle seguro de acessos e informações sensíveis.
              </h1>
              <p className="text-lg text-zinc-400 max-w-xl leading-relaxed">
                Gerencie credenciais, documentos, licenças, equipamentos e informações críticas dos clientes em um ambiente seguro, auditável e organizado.
              </p>
            </div>

            <div className="relative z-10 mt-12 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Acesso Rápido</h3>
                  <p className="text-zinc-400 text-sm">Busque e copie credenciais com um clique.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <ShieldCheck className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Segurança em Primeiro Lugar</h3>
                  <p className="text-zinc-400 text-sm">Criptografia, auditoria e controle de acessos.</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-12 text-sm text-zinc-500">
              © 2024 {branding.appName || "Cofre de Senhas"}. Todos os direitos reservados.
            </div>
          </>
        )}
      </div>

      {/* Right Panel: Login / Force Password Change */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {requirePasswordChange ? (
            <>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-amber-500">
                  <AlertTriangle className="w-6 h-6" />
                  <h2 className="font-display text-2xl font-bold">Senha Expirada</h2>
                </div>
                <p className="text-muted-foreground">Sua senha expirou. Defina uma nova senha para continuar.</p>
                <p className="text-xs text-muted-foreground">
                  A senha deve ter no mínimo 10 caracteres, incluindo maiúscula, minúscula, número e caractere especial.
                </p>
              </div>

              <Card className="p-8 border-border shadow-xl shadow-black/5 rounded-2xl">
                <form onSubmit={handleForcePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordChangeData.newPassword}
                      onChange={(e) => setPasswordChangeData({ ...passwordChangeData, newPassword: e.target.value })}
                      placeholder="Nova senha forte"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordChangeData.confirmPassword}
                      onChange={(e) => setPasswordChangeData({ ...passwordChangeData, confirmPassword: e.target.value })}
                      placeholder="Repita a nova senha"
                      required
                    />
                  </div>

                  {passwordChangeError && (
                    <div className="text-red-500 text-sm text-center">{passwordChangeError}</div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                    disabled={forcePasswordChangeMutation.isPending}
                  >
                    {forcePasswordChangeMutation.isPending ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </form>
              </Card>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h2 className="font-display text-3xl font-bold">Bem-vindo de volta</h2>
                <p className="text-muted-foreground">Entre para acessar seu painel</p>
              </div>

              <Card className="p-8 border-border shadow-xl shadow-black/5 rounded-2xl">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuário</Label>
                    <Input
                      id="username"
                      type="text"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      placeholder="admin"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="admin"
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-red-500 text-sm text-center">{error}</div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
