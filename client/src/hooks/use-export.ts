import { useMutation } from "@tanstack/react-query";

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

async function exportLicenses(): Promise<void> {
  const response = await fetch("/api/export/licenses.csv", { credentials: "include" });
  if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
  const blob = await response.blob();
  downloadBlob(blob, "licenses.csv");
}

async function exportClients(): Promise<void> {
  const response = await fetch("/api/export/clients.csv", { credentials: "include" });
  if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
  const blob = await response.blob();
  downloadBlob(blob, "clients.csv");
}

export function useExportLicenses() {
  return useMutation({ mutationFn: exportLicenses });
}

export function useExportClients() {
  return useMutation({ mutationFn: exportClients });
}
