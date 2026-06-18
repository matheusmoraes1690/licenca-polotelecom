import { useAlerts } from "@/hooks/use-alerts";
import { AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function AlertsBanner() {
  const { data: alerts = [] } = useAlerts();
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) return null;

  const critical = alerts.filter(a => a.severity === "critical");
  const warning = alerts.filter(a => a.severity === "warning");

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="font-medium text-amber-800 dark:text-amber-400">
            {alerts.length} alerta{alerts.length > 1 ? "s" : ""} de renovação
          </span>
          {critical.length > 0 && (
            <Badge variant="destructive">{critical.length} crítico(s)</Badge>
          )}
          {warning.length > 0 && (
            <Badge className="bg-amber-500 hover:bg-amber-600">{warning.length} aviso(s)</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(v => !v)}>
          {expanded ? "Ocultar" : "Ver"}
        </Button>
      </div>
      {expanded && (
        <div className="mt-2 space-y-2">
          {alerts.map(alert => (
            <div key={alert.licenseId} className="flex items-center justify-between bg-card rounded p-2 border border-border">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{alert.clientName}</span>
                <span className="text-sm text-muted-foreground">— {alert.licenseKey}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${alert.daysRemaining <= 7 ? "text-red-600" : "text-amber-600"}`}>
                  {alert.daysRemaining} dia{alert.daysRemaining !== 1 ? "s" : ""}
                </span>
                <Badge variant={alert.daysRemaining <= 7 ? "destructive" : "outline"}>
                  {alert.renewalType}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
