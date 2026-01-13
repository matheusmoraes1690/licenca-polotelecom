import { useDashboardStats } from "@/hooks/use-dashboard";
import { Layout } from "@/components/layout";
import { StatCard } from "@/components/stat-card";
import { 
  Users, 
  CreditCard, 
  AlertTriangle, 
  Monitor, 
  DollarSign, 
  CheckCircle 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  const mockChartData = [
    { name: 'Jan', value: 40 },
    { name: 'Feb', value: 30 },
    { name: 'Mar', value: 20 },
    { name: 'Apr', value: 27 },
    { name: 'May', value: 18 },
    { name: 'Jun', value: 23 },
    { name: 'Jul', value: 34 },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </Layout>
    );
  }

  if (!stats) return null;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your asset compliance and inventory.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard 
          title="Total Clients" 
          value={stats.totalClients} 
          icon={Users} 
          description="Active managed accounts"
          trend="up"
          trendValue="12%"
        />
        <StatCard 
          title="Active Licenses" 
          value={stats.activeLicenses} 
          icon={CheckCircle}
          description="Currently valid subscriptions"
          className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20"
        />
        <StatCard 
          title="Expiring Soon" 
          value={stats.expiringLicenses} 
          icon={AlertTriangle}
          description="Licenses expiring in < 30 days"
          className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20"
        />
        <StatCard 
          title="Total Hardware" 
          value={stats.totalHardware} 
          icon={Monitor}
          description="Devices in inventory"
        />
        <StatCard 
          title="Asset Value" 
          value={`$${stats.hardwareValue.toLocaleString()}`} 
          icon={DollarSign}
          description="Total hardware cost"
        />
        <StatCard 
          title="Total Licenses" 
          value={stats.totalLicenses} 
          icon={CreditCard}
          description="All time licenses tracked"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 bg-card rounded-2xl border border-border/50 shadow-sm p-6">
          <h3 className="text-lg font-bold font-display mb-6">License Acquisition Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {mockChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.6)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-3 bg-card rounded-2xl border border-border/50 shadow-sm p-6">
          <h3 className="text-lg font-bold font-display mb-4">Quick Actions</h3>
          <div className="space-y-4">
             <div className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="font-semibold text-sm">Add New Client</h4>
                      <p className="text-xs text-muted-foreground">Onboard a new customer profile</p>
                   </div>
                </div>
             </div>
             <div className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CreditCard className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="font-semibold text-sm">Assign License</h4>
                      <p className="text-xs text-muted-foreground">Allocate software key to client</p>
                   </div>
                </div>
             </div>
             <div className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Monitor className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="font-semibold text-sm">Log Hardware</h4>
                      <p className="text-xs text-muted-foreground">Register new equipment</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
