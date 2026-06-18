import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClientDocument, InsertClientDocument } from "@shared/schema";

export function useClientDocuments(clientId: number) {
  return useQuery<ClientDocument[]>({
    queryKey: [`/api/clients/${clientId}/documents`],
    enabled: !!clientId,
  });
}

export function useCreateClientDocument(clientId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<InsertClientDocument, 'clientId'>) => {
      console.log('Creating document with data:', data);
      const payload = { ...data, clientId };
      console.log('Payload being sent:', payload);
      
      const response = await fetch(`/api/clients/${clientId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error response:', error);
        throw new Error(error.message || "Failed to create document");
      }

      const result = await response.json();
      console.log('Document created successfully:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Invalidating queries for client:', clientId);
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/documents`] });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
    },
  });
}

export function useDeleteClientDocument(clientId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/clients/${clientId}/documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/documents`] });
    },
  });
}
