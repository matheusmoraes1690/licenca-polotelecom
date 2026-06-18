import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, ChevronRight, ShieldCheck, Key } from "lucide-react";

interface ClientCardProps {
  client: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    status: string | null;
    document?: string | null;
    milvusId?: string | null;
    source?: string | null;
    lastSyncAt?: Date | string | null;
    syncStatus?: string | null;
    milvusUpdatedAt?: Date | string | null;
    activeLicenseCount?: number;
  };
}

export function ClientCard({ client }: ClientCardProps) {
  return (
    <Link href={`/clients/${client.id}`} className="block group">
      <Card className="h-full border-border/50 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-card cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-bold text-sm">
                  {client.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors truncate">
                  {client.name}
                </h3>
                {client.document && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {client.document}
                  </p>
                )}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                    client.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {client.status === "active" ? "ATIVO" : "DESATIVADO"}
                </span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{client.address}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Key className="w-3.5 h-3.5 text-green-500 shrink-0" />
              <span>
                <span className="font-medium text-foreground">
                  {client.activeLicenseCount ?? 0}
                </span>{" "}
                licenças ativas
              </span>
            </div>
            {(client.source === "milvus" || client.milvusId) && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 gap-1 shrink-0"
              >
                <ShieldCheck className="w-3 h-3 text-blue-500" />
                Sincronizado
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
