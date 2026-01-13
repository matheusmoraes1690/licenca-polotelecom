import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateLicenseRequest, type UpdateLicenseRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useLicenses(params?: { clientId?: string }) {
  return useQuery({
    queryKey: [api.licenses.list.path, params?.clientId],
    queryFn: async () => {
      let url = api.licenses.list.path;
      if (params?.clientId) {
        url += `?clientId=${params.clientId}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch licenses");
      return api.licenses.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateLicenseRequest) => {
      // Ensure purchaseDate is a string for JSON serialization, then backend parses it
      // Zod coerce is handled on backend, but JSON.stringify needs help with Dates if not configured
      const res = await fetch(api.licenses.create.path, {
        method: api.licenses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create license");
      }
      return api.licenses.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.licenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "License created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateLicenseRequest) => {
      const url = buildUrl(api.licenses.update.path, { id });
      const res = await fetch(url, {
        method: api.licenses.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update license");
      return api.licenses.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.licenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "License updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.licenses.delete.path, { id });
      const res = await fetch(url, { method: api.licenses.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete license");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.licenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "License deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
