import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandingSettings {
  sidebarLogo?: string | null;
  favicon?: string | null;
  appName?: string | null;
  loginHeroImage?: string | null;
}

export function useSystemSetting(key: string) {
  return useQuery<SystemSetting>({
    queryKey: ["system-setting", key],
    queryFn: async () => {
      const res = await fetch(`/api/settings/${key}`, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar configuração");
      return res.json();
    },
  });
}

export function useBrandingSettings() {
  const { data: setting } = useQuery<SystemSetting>({
    queryKey: ["branding"],
    queryFn: async () => {
      const res = await fetch("/api/branding", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar branding");
      return res.json();
    },
  });
  if (!setting) return { sidebarLogo: null, favicon: null, appName: null, loginHeroImage: null } as BrandingSettings;
  try {
    return JSON.parse(setting.value) as BrandingSettings;
  } catch {
    return { sidebarLogo: null, favicon: null, appName: null, loginHeroImage: null } as BrandingSettings;
  }
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch(`/api/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Falha ao atualizar configuração");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["system-setting", variables.key] });
      toast({ title: "Sucesso", description: "Configuração salva com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
