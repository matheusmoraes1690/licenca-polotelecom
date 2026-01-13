import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function AuthPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Left Panel: Hero */}
      <div className="flex-1 lg:flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden bg-zinc-900 text-white">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-xl bg-white text-zinc-900 flex items-center justify-center font-bold text-xl">L</div>
            <span className="font-display font-bold text-xl tracking-tight">LicenceMgr</span>
          </div>
          
          <h1 className="font-display text-4xl lg:text-6xl font-bold leading-[1.1] mb-6">
            Master your digital assets with elegance.
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl leading-relaxed">
            The all-in-one platform for managing client relationships, software licenses, and hardware inventory. Compliance made beautiful.
          </p>
        </div>

        <div className="relative z-10 mt-12 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Instant Insights</h3>
              <p className="text-zinc-400 text-sm">Real-time dashboard for asset health.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
              <ShieldCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Compliance First</h3>
              <p className="text-zinc-400 text-sm">Never miss a license expiration again.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12 text-sm text-zinc-500">
          © 2024 LicenceMgr Inc. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Login */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h2 className="font-display text-3xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to access your dashboard</p>
          </div>

          <Card className="p-8 border-border shadow-xl shadow-black/5 rounded-2xl">
            <div className="space-y-4">
              <Button 
                size="lg" 
                className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                onClick={() => window.location.href = "/api/login"}
              >
                Log in with Replit
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Trusted by teams at</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Placeholder logos */}
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse delay-75" />
                <div className="h-8 bg-muted rounded animate-pulse delay-150" />
              </div>
            </div>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            By clicking continue, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
