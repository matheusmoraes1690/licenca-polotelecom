import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuditLogs, type AuditLog } from "@/hooks/use-audit";
import {
  Clock,
  User,
  FileText,
  ArrowRight,
  Monitor,
  ChevronRight,
  Activity,
} from "lucide-react";
import { DataPagination } from "@/components/data-pagination";
import { useState } from "react";
import { cn } from "@/lib/utils";

const actionLabels: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  restore: "Restauração",
  permanent_delete: "Exclusão Definitiva",
  reveal_password: "Revelar Senha",
  copy_password: "Copiar Senha",
  import: "Importação",
  sync: "Sincronização",
};

const detailKeyLabels: Record<string, string> = {
  method: "Método",
  metodo: "Método",
  title: "Título",
  nome: "Nome",
  reason: "Motivo",
  changedFields: "Campos alterados",
  source: "Fonte",
  milvusId: "ID Milvus",
  key: "Chave",
};

const actionColors: Record<string, string> = {
  login: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  logout: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  create: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  update: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  restore: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  permanent_delete: "bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-300",
  reveal_password: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  copy_password: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400",
  import: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
  sync: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function computeDiff(snapshot: Record<string, unknown> | null, current: Record<string, unknown> | null) {
  if (!snapshot || !current) return [];
  const keys = new Set([...Object.keys(snapshot), ...Object.keys(current)]);
  const diffs: { key: string; before: string; after: string }[] = [];
  for (const key of keys) {
    if (key === "id" || key === "createdAt" || key === "updatedAt" || key === "passwordHash") continue;
    const before = formatValue(snapshot[key]);
    const after = formatValue(current[key]);
    if (before !== after) {
      diffs.push({ key, before, after });
    }
  }
  return diffs;
}

function formatAuditDetails(details: string | null): string {
  if (!details) return "—";
  const obj = parseJson<Record<string, unknown>>(details);
  if (!obj) return details;

  const entries = Object.entries(obj)
    .filter(([k]) => k !== "snapshot" && k !== "changedFields")
    .map(([k, v]) => {
      const label = detailKeyLabels[k] || k;
      if (Array.isArray(v)) {
        return `${label}: ${v.join(", ")}`;
      }
      return `${label}: ${formatValue(v)}`;
    });

  return entries.join(" | ") || "—";
}

function AuditDiff({ log }: { log: AuditLog }) {
  const snapshot = parseJson<Record<string, unknown>>(log.snapshot);
  const details = parseJson<Record<string, unknown>>(log.details);
  const diffs = computeDiff(snapshot, details);
  const changedFields = details?.changedFields as string[] | undefined;

  if (!snapshot || diffs.length === 0) {
    return (
      <div className="space-y-2">
        {details && (
          <div className="text-sm bg-muted p-3 rounded-md space-y-1">
            {Object.entries(details)
              .filter(([k]) => k !== "snapshot" && k !== "changedFields")
              .map(([k, v]) => {
                const label = detailKeyLabels[k] || k;
                const value = Array.isArray(v) ? v.join(", ") : formatValue(v);
                return (
                  <div key={k} className="flex items-start gap-2">
                    <span className="text-muted-foreground font-medium">{label}:</span>
                    <span>{value}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {changedFields && changedFields.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {changedFields.map((field) => (
            <Badge key={field} variant="outline" className="text-xs capitalize">
              {field}
            </Badge>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {diffs.map(({ key, before, after }) => (
          <div key={key} className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center text-sm border-b border-border/50 pb-2 last:border-0">
            <div className="text-right">
              <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-0.5">{key}</span>
              <span className="text-red-600 dark:text-red-400 line-through bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded inline-block max-w-full truncate" title={before}>
                {before}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-0.5">{key}</span>
              <span className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded inline-block max-w-full truncate" title={after}>
                {after}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const limit = 20;
  const { data: logsData } = useAuditLogs(page, limit);
  const logs = logsData?.data ?? [];
  const totalPages = Math.ceil((logsData?.total || 0) / limit);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  const resourceLabels: Record<string, string> = {
    credential: "Credencial",
    client: "Cliente",
    license: "Licença",
    fornecedor: "Fornecedor",
    produto: "Produto",
    user: "Usuário",
    document: "Documento",
    auth: "Autenticação",
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground mt-1">
            Registro de todas as ações sensíveis do sistema.
          </p>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Data/Hora</TableHead>
                <TableHead className="w-[140px]">Usuário</TableHead>
                <TableHead className="w-[120px]">Ação</TableHead>
                <TableHead className="w-[120px]">Recurso</TableHead>
                <TableHead>Alterações</TableHead>
                <TableHead className="w-[110px]">IP</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.length > 0 ? (
                logs.map((log) => {
                  const hasSnapshot = !!log.snapshot;
                  const detailsObj = parseJson<Record<string, unknown>>(log.details);
                  const changedCount = (detailsObj?.changedFields as string[] | undefined)?.length ?? 0;
                  return (
                    <TableRow
                      key={log.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        hasSnapshot && "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{formatDate(log.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{log.userName || "Sistema"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(actionColors[log.action] || "bg-muted", "text-xs")}>
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {resourceLabels[log.resource] || log.resource}
                        {log.entityId && (
                          <span className="text-muted-foreground text-xs ml-1">#{log.entityId}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.action === "update" && changedCount > 0 ? (
                          <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-sm">
                              {changedCount} campo{changedCount > 1 ? "s" : ""} alterado{changedCount > 1 ? "s" : ""}
                            </span>
                            <Badge variant="secondary" className="text-[10px] h-5">
                              ver detalhes
                            </Badge>
                          </div>
                        ) : log.details ? (
                          <div className="flex items-center gap-2 max-w-xs">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground truncate" title={formatAuditDetails(log.details)}>
                              {formatAuditDetails(log.details)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Monitor className="w-3 h-3" />
                          {log.ipAddress || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum registro de auditoria encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <DataPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-amber-500" />
              Detalhes da Ação
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide block">Data/Hora</span>
                  <span className="font-medium">{formatDate(selectedLog.createdAt)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide block">Usuário</span>
                  <span className="font-medium">{selectedLog.userName || "Sistema"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide block">Ação</span>
                  <Badge variant="outline" className={cn(actionColors[selectedLog.action] || "bg-muted", "text-xs mt-0.5")}>
                    {actionLabels[selectedLog.action] || selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide block">Recurso</span>
                  <span className="font-medium capitalize">{resourceLabels[selectedLog.resource] || selectedLog.resource}</span>
                  {selectedLog.entityId && (
                    <span className="text-muted-foreground text-xs ml-1">#{selectedLog.entityId}</span>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide block">IP / User-Agent</span>
                  <span className="font-mono text-xs">{selectedLog.ipAddress || "—"}</span>
                </div>
              </div>

              {(selectedLog.snapshot || selectedLog.details) && (
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    {selectedLog.snapshot ? "Alterações realizadas" : "Detalhes"}
                  </h4>
                  <AuditDiff log={selectedLog} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
