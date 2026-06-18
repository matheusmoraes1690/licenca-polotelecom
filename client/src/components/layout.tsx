import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateUser } from "@/hooks/use-users";
import { useAlerts } from "@/hooks/use-alerts";
import { useBrandingSettings } from "@/hooks/use-settings";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LogOut,
  Menu,
  FolderPlus,
  ChevronDown,
  KeyRound,
  Shield,
  Trash2,
  Settings,
  CloudDownload,
  Bell,
  TrendingUp,
  X,
  PanelLeft,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const updateUser = useUpdateUser();
  const { data: alerts } = useAlerts();
  const branding = useBrandingSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vault", label: "Cofre de Senhas", icon: KeyRound },
    { href: "/credentials", label: "Credenciais", icon: Shield },
    { href: "/clients", label: "Clientes", icon: Users },
    { href: "/licenses", label: "Licenças", icon: CreditCard },
    { href: "/audit", label: "Auditoria", icon: Shield },
    { href: "/trash", label: "Lixeira", icon: Trash2 },
    { href: "/settings", label: "Configurações", icon: Settings },
  ];

  const cadastroItems = [
    { href: "/fornecedores", label: "Fornecedores" },
    { href: "/produtos", label: "Produtos" },
    { href: "/clients/import-milvus", label: "Importar do Milvus" },
    { href: "/settings/milvus", label: "Integração Milvus" },
  ];

  const [isCadastroOpen, setIsCadastroOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarCollapsed") === "true";
    }
    return false;
  });
  const { isDark, toggleTheme } = useTheme();

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className={cn("p-5", isSidebarCollapsed && "p-3")}>
        {/* System Logo */}
        <div className={cn(
          "flex items-center gap-3 mb-8 p-3 rounded-xl",
          isSidebarCollapsed && "justify-center mb-6 p-2",
          branding.sidebarLogo ? "bg-transparent" : "bg-polo-red"
        )}>
          {branding.sidebarLogo ? (
            <img
              src={branding.sidebarLogo}
              alt="Logo"
              className={cn("h-10 w-auto object-contain", isSidebarCollapsed ? "max-w-[48px]" : "max-w-[210px]")}
            />
          ) : (
            <>
              <div className={cn(
                "rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-lg backdrop-blur-sm shrink-0",
                isSidebarCollapsed ? "h-10 w-10" : "h-9 w-9"
              )}>
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <span className="font-bold text-white text-base tracking-tight block leading-none truncate">
                    {branding.appName || "Polo Telecom"}
                  </span>
                  <span className="text-[11px] text-white/80 uppercase tracking-wider font-medium">License Manager</span>
                </div>
              )}
            </>
          )}
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={isSidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-[10px] text-sm font-medium transition-all duration-200",
                  isSidebarCollapsed
                    ? "justify-center px-3 py-[14px]"
                    : "gap-3 px-5 py-[14px]",
                  isActive
                    ? "polo-gradient text-white shadow-md shadow-polo-red/25"
                    : "text-[#555577] dark:text-[#A8A8A8] hover:bg-polo-red-light dark:hover:bg-[#242424] hover:text-polo-red dark:hover:text-[#F0F0F0]"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-[#555577] dark:text-[#A8A8A8]")} />
                {!isSidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}

          <Collapsible open={isCadastroOpen} onOpenChange={setIsCadastroOpen}>
            <CollapsibleTrigger
              className={cn(
                "flex items-center w-full rounded-[10px] text-sm font-medium transition-all duration-200",
                isSidebarCollapsed
                  ? "justify-center px-3 py-[14px]"
                  : "justify-between gap-3 px-5 py-[14px]",
                cadastroItems.some(item => location === item.href)
                  ? "polo-gradient text-white shadow-md shadow-polo-red/25"
                  : "text-[#555577] dark:text-[#A8A8A8] hover:bg-polo-red-light dark:hover:bg-[#242424] hover:text-polo-red dark:hover:text-[#F0F0F0]"
              )}
            >
              <div className={cn("flex items-center", isSidebarCollapsed ? "justify-center" : "gap-3")}>
                <FolderPlus className={cn(
                  "w-5 h-5 shrink-0",
                  cadastroItems.some(item => location === item.href) ? "text-white" : "text-[#555577] dark:text-[#A8A8A8]"
                )} />
                {!isSidebarCollapsed && <span className="font-medium">Cadastro</span>}
              </div>
              {!isSidebarCollapsed && (
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isCadastroOpen && "transform rotate-180"
                )} />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-1">
              {cadastroItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 py-2 rounded-[10px] text-sm font-medium transition-all duration-200",
                      isSidebarCollapsed
                        ? "justify-center px-3"
                        : "pl-14 pr-5",
                      isActive
                        ? "bg-polo-red-light text-polo-red dark:bg-accent dark:text-white"
                        : "text-[#555577] dark:text-[#A8A8A8] hover:bg-polo-red-light/60 dark:hover:bg-[#242424] hover:text-polo-red dark:hover:text-[#F0F0F0]"
                    )}
                  >
                    {!isSidebarCollapsed ? item.label : (
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </nav>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F0F0F] flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block border-r border-[#EEEEF5] dark:border-[#2E2E2E] fixed h-full bg-white dark:bg-[#141414] z-20 transition-all duration-300",
          isSidebarCollapsed ? "w-[80px]" : "w-[280px]"
        )}
      >
        <NavContent />
      </aside>

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          isSidebarCollapsed ? "lg:ml-[80px]" : "lg:ml-[280px]"
        )}
      >
        {/* Top Header */}
        <header
          className={cn(
            "h-16 bg-white dark:bg-[#141414] sticky top-0 z-10 px-6 flex items-center justify-between transition-shadow duration-200",
            scrolled ? "shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]" : "border-b border-[#EEEEF5] dark:border-[#2E2E2E]"
          )}
        >
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-polo-red hover:bg-polo-red-light">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px] bg-white dark:bg-[#141414] border-r border-[#EEEEF5] dark:border-[#2E2E2E]">
                  <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                  <NavContent onNavigate={() => setIsMobileMenuOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden lg:flex text-[#555577] dark:text-[#A8A8A8] hover:bg-polo-red-light dark:hover:bg-[#242424] hover:text-polo-red dark:hover:text-[#F0F0F0] transition-colors"
              title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <PanelLeft className={cn("h-5 w-5 transition-transform duration-200", isSidebarCollapsed && "rotate-180")} />
            </Button>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <DropdownMenu open={isNotifOpen} onOpenChange={setIsNotifOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-10 w-10 rounded-full hover:bg-polo-red-light dark:hover:bg-[#242424] text-[#555577] dark:text-[#A8A8A8] hover:text-polo-red dark:hover:text-[#F0F0F0] transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {alerts && alerts.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-polo-red ring-2 ring-white" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#1A1A2E] dark:text-[#F0F0F0]">Notificações</p>
                    {alerts && alerts.length > 0 && (
                      <span className="text-xs bg-polo-red text-white px-2 py-0.5 rounded-full">{alerts.length} {alerts.length === 1 ? "nova" : "novas"}</span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {alerts && alerts.length > 0 ? (
                  <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
                    {alerts.map((alert) => (
                      <button
                        key={alert.licenseId}
                        onClick={() => {
                          setIsNotifOpen(false);
                          navigate("/licenses");
                        }}
                        className="w-full flex items-start gap-3 text-left hover:bg-polo-red-light/40 rounded-lg p-2 transition-colors"
                      >
                        <div className={cn(
                          "h-2 w-2 mt-2 rounded-full shrink-0",
                          alert.severity === "critical" ? "bg-red-600" : "bg-polo-red"
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm text-[#1A1A2E] dark:text-[#F0F0F0] truncate">{alert.clientName}</p>
                          <p className="text-xs text-[#555577] dark:text-[#A8A8A8] mt-0.5 truncate">{alert.licenseKey} — vence em {alert.daysRemaining} dia{alert.daysRemaining !== 1 ? "s" : ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="h-8 w-8 text-[#555577]/30 dark:text-[#A8A8A8]/30 mx-auto mb-2" />
                    <p className="text-sm text-[#555577] dark:text-[#A8A8A8]">Nenhuma notificação</p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-polo-red-light transition-colors">
                  <Avatar className="h-10 w-10 border-2 border-polo-red/10">
                    <AvatarFallback className="bg-polo-red text-white font-semibold text-sm">
                      {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || user?.username?.[0]?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-[#1A1A2E] dark:text-[#F0F0F0]">{user?.name || user?.username}</p>
                    <p className="text-xs leading-none text-[#555577] dark:text-[#A8A8A8]">{user?.username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4 text-[#555577] dark:text-[#A8A8A8]" />
                  Alterar Senha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = "/settings"} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4 text-[#555577] dark:text-[#A8A8A8]" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                  {isDark ? (
                    <Sun className="mr-2 h-4 w-4 text-[#555577] dark:text-[#A8A8A8]" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4 text-[#555577] dark:text-[#A8A8A8]" />
                  )}
                  {isDark ? "Modo Claro" : "Modo Escuro"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-polo-red focus:text-polo-red focus:bg-polo-red-light">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Password Change Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Alterar Senha</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPasswordError("");
                    if (!user) return;
                    if (passwordForm.newPassword.length < 6) {
                      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
                      return;
                    }
                    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                      setPasswordError("As senhas não coincidem.");
                      return;
                    }
                    updateUser.mutate(
                      { id: user.id, data: { password: passwordForm.newPassword } },
                      {
                        onSuccess: () => {
                          setIsPasswordDialogOpen(false);
                          setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                        },
                      }
                    );
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="border-[#EEEEF5] dark:border-border focus:border-polo-red focus:ring-polo-red/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Repita a nova senha"
                      required
                      className="border-[#EEEEF5] dark:border-border focus:border-polo-red focus:ring-polo-red/10"
                    />
                  </div>
                  {passwordError && (
                    <p className="text-sm text-polo-red">{passwordError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="border-[#EEEEF5] dark:border-border">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={updateUser.isPending} className="bg-polo-red hover:bg-polo-red-dark">
                      {updateUser.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-5 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
