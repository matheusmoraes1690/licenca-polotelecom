import { useState, useEffect } from "react";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type CreateClientRequest } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClientCard } from "@/components/client-card";
import { DataPagination } from "@/components/data-pagination";

export default function ClientsPage() {
  const [page, setPage] = useState(1);
  const limit = 12;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const { data: clientsData, isLoading } = useClients(page, limit, searchTerm, statusFilter);
  const clients = clientsData?.data;
  const totalPages = Math.ceil((clientsData?.total || 0) / limit);
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);
  const createClient = useCreateClient();
  const canCreate = user?.role === "admin" || user?.role === "editor";

  const form = useForm<CreateClientRequest>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "active",
    },
  });

  const onSubmit = (data: CreateClientRequest) => {
    createClient.mutate(data, {
      onSuccess: () => {
        setIsCreateOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus relacionamentos com clientes.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              className="pl-10 h-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
          
          <div className="flex gap-2 border rounded-lg p-1 bg-card h-10 items-center">
            <Button
              variant={statusFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setStatusFilter("all"); setPage(1); }}
              className="h-8"
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setStatusFilter("active"); setPage(1); }}
              className="h-8"
            >
              Ativos
            </Button>
            <Button
              variant={statusFilter === "inactive" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setStatusFilter("inactive"); setPage(1); }}
              className="h-8"
            >
              Desativados
            </Button>
          </div>
          
          {canCreate && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/25 h-10">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Cliente
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Cliente</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Empresa XYZ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="contact@acme.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 98765-4321" {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>STATUS DO CLIENTE</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value || "active"}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="active" id="active" />
                              <Label htmlFor="active" className="font-normal cursor-pointer">ATIVO</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="inactive" id="inactive" />
                              <Label htmlFor="inactive" className="font-normal cursor-pointer">DESATIVADO</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createClient.isPending}>
                      {createClient.isPending ? "Criando..." : "Criar Cliente"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients?.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
          <DataPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </Layout>
  );
}
