import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateHardwareRequest, type UpdateHardwareRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useHardware(params?: { clientId?: string }) {
  return useQuery({
    queryKey: [api.hardware.list.path, params?.clientId],
    queryFn: async () => {
      let url = api.hardware.list.path;
      if (params?.clientId) {
        url += `?clientId=${params.clientId}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch hardware");
      return api.hardware.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateHardware() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateHardwareRequest) => {
      const res = await fetch(api.hardware.create.path, {
        method: api.hardware.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create hardware");
      }
      return api.hardware.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.hardware.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "Hardware added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateHardware() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateHardwareRequest) => {
      const url = buildUrl(api.hardware.update.path, { id });
      const res = await fetch(url, {
        method: api.hardware.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update hardware");
      return api.hardware.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.hardware.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "Hardware updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteHardware() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.hardware.delete.path, { id });
      const res = await fetch(url, { method: api.hardware.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete hardware");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.hardware.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "Hardware deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
