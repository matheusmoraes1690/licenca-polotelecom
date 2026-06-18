import { useEffect, useState } from "react";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { Layout } from "@/components/layout";
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";
import {
  Users,
  CreditCard,
  AlertTriangle,
  Infinity,
  CheckCircle,
  KeyRound,
  ShieldAlert,
  Plus,
  FileText
} from "lucide-react";
import { AlertsBanner } from "@/components/alerts-banner";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <Layout>
      <div className="mb-8">
        <Skeleton className="h-9 w-64 rounded-lg mb-2" />
        <Skeleton className="h-5 w-96 rounded-lg" />
      </div>
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
        <Skeleton className="h-[380px] rounded-2xl lg:col-span-3" />
      </div>
    </Layout>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!stats) return null;

  return (
    <Layout>
      {/* Alerts Banner */}
      <AlertsBanner />

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do cofre de senhas, acessos e informações sensíveis dos clientes.</p>
      </div>

      {/* Stat Cards Row 1 */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          title="Credenciais no Cofre"
          value={stats.totalCredentials}
          icon={KeyRound}
          description="Total de credenciais cadastradas"
          color="#E8002D"
          bgColor="#FFF0F3"
          delay={0}
        />
        <StatCard
          title="Credenciais Ativas"
          value={stats.activeCredentials}
          icon={CheckCircle}
          description="Credenciais em uso"
          color="#00C853"
          bgColor="#E8F5E9"
          delay={50}
        />
        <StatCard
          title="Eventos de Auditoria"
          value={stats.recentAuditEvents}
          icon={ShieldAlert}
          description="Ações registradas recentemente"
          color="#FF6D00"
          bgColor="#FFF3E0"
          delay={100}
        />
        <StatCard
          title="Total de Clientes"
          value={stats.totalClients}
          icon={Users}
          description="Clientes cadastrados"
          color="#2979FF"
          bgColor="#E3F2FD"
          delay={150}
        />
      </div>

      {/* Stat Cards Row 2 */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Licenças Ativas"
          value={stats.activeLicenses}
          icon={CreditCard}
          description="Assinaturas válidas"
          color="#00C853"
          bgColor="#E8F5E9"
          delay={200}
        />
        <StatCard
          title="Expirando em Breve"
          value={stats.expiringLicenses}
          icon={AlertTriangle}
          description="Licenças expiradas ou suspensas"
          color="#FF6D00"
          bgColor="#FFF3E0"
          delay={250}
        />
        <StatCard
          title="Licenças Perpétuas"
          value={stats.perpetualLicenses}
          icon={Infinity}
          description="Sem renovação necessária"
          color="#7C4DFF"
          bgColor="#EDE7F6"
          delay={300}
        />
        <StatCard
          title="Total de Licenças"
          value={stats.totalLicenses}
          icon={CreditCard}
          description="Todas as licenças cadastradas"
          color="#E8002D"
          bgColor="#FFF0F3"
          delay={350}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-2xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] p-6">
        <h3 className="text-base font-bold text-foreground mb-5">Ações Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickActionCard
            icon={Plus}
            iconBg="#FFF0F3"
            iconColor="#E8002D"
            title="Nova Credencial"
            description="Cadastrar senha ou acesso de cliente"
            href="/vault/new"
            delay={0}
          />
          <QuickActionCard
            icon={Users}
            iconBg="#E8F5E9"
            iconColor="#00C853"
            title="Adicionar Cliente"
            description="Cadastrar novo perfil de cliente"
            href="/clients"
            delay={100}
          />
          <QuickActionCard
            icon={ShieldAlert}
            iconBg="#EDE7F6"
            iconColor="#7C4DFF"
            title="Ver Auditoria"
            description="Consultar logs de acesso"
            href="/audit"
            delay={200}
          />
          <QuickActionCard
            icon={FileText}
            iconBg="#E3F2FD"
            iconColor="#2979FF"
            title="Relatórios"
            description="Exportar dados e análises"
            href="/audit"
            delay={300}
          />
        </div>
      </div>
    </Layout>
  );
}

interface QuickActionCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  href: string;
  delay?: number;
}

function QuickActionCard({ icon: Icon, iconBg, iconColor, title, description, href, delay = 0 }: QuickActionCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 400 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border border-border bg-card transition-all duration-150 hover:bg-polo-red-light dark:hover:bg-accent/10 hover:border-l-[3px] hover:border-l-polo-red dark:hover:border-l-accent cursor-pointer group",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-110"
        style={{ backgroundColor: iconBg }}
      >
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <h4 className="font-semibold text-sm text-foreground truncate">{title}</h4>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </a>
  );
}
