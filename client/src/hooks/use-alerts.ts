import { useQuery } from "@tanstack/react-query";

export interface Alert {
  licenseId: number;
  licenseKey: string;
  clientName: string;
  expirationDate: string;
  daysRemaining: number;
  renewalType: string;
  severity: "critical" | "warning";
}

async function fetchAlerts(): Promise<Alert[]> {
  const response = await fetch("/api/alerts", { credentials: "include" });
  if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
  return response.json();
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    refetchInterval: 60000,
    staleTime: 0,
  });
}
