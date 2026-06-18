import { useState } from "react";
import { useLicenses, useCreateLicense, useUpdateLicense, useDeleteLicense } from "@/hooks/use-licenses";
import { useClients } from "@/hooks/use-clients";
import { useFornecedores } from "@/hooks/use-fornecedores";
import { useProdutos } from "@/hooks/use-produtos";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, CheckCircle, XCircle, AlertTriangle, MoreVertical, Pencil, Trash2, Download } from "lucide-react";
import { useExportLicenses } from "@/hooks/use-export";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLicenseSchema, type CreateLicenseRequest, type License } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { format } from "date-fns";
import { DataPagination } from "@/components/data-pagination";

export default function LicensesPage() {
  const [page, setPage] = useState(1);
  const limit = 15;
  const { data: licensesData, isLoading } = useLicenses({ page, limit });
  const licenses = licensesData?.data;
  const totalPages = Math.ceil((licensesData?.total || 0) / limit);
  const { data: clientsData } = useClients();
  const clients = clientsData?.data;
  const { data: fornecedoresData } = useFornecedores();
  const fornecedores = fornecedoresData?.data;
  const { data: produtosData } = useProdutos();
  const produtos = produtosData?.data;
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const createLicense = useCreateLicense();
  const updateLicense = useUpdateLicense();
  const deleteLicense = useDeleteLicense();
  const exportLicenses = useExportLicenses();

  const form = useForm<CreateLicenseRequest>({
    resolver: zodResolver(insertLicenseSchema),
    defaultValues: {
      key: "",
      fornecedorId: null,
      contractType: "new",
      renewalType: "annual",
      status: "active",
      produtoId: null,
      clientId: null,
      notes: "",
      serviceCategory: "",
      expirationDate: null,
      alertDaysBefore: 30,
    },
  });

  const editForm = useForm<CreateLicenseRequest>({
    resolver: zodResolver(insertLicenseSchema),
  });

  const onSubmit = (data: CreateLicenseRequest) => {
    console.log('Submitting license data:', data);
    createLicense.mutate(data, {
      onSuccess: () => {
        setIsCreateOpen(false);
        form.reset();
      },
    });
  };

  const onEdit = (data: CreateLicenseRequest) => {
    if (!selectedLicense) return;
    updateLicense.mutate(
      { id: selectedLicense.id, ...data },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setSelectedLicense(null);
          editForm.reset();
        },
      }
    );
  };

  const handleEdit = (license: License) => {
    setSelectedLicense(license);
    editForm.reset({
      key: license.key,
      fornecedorId: license.fornecedorId,
      contractType: (license.contractType || "new") as any,
      renewalType: (license.renewalType || "annual") as any,
      status: license.status || "active",
      produtoId: license.produtoId,
      clientId: license.clientId,
      notes: license.notes || "",
      serviceCategory: license.serviceCategory || "",
      expirationDate: license.expirationDate ? new Date(license.expirationDate).toISOString().split("T")[0] : null,
      alertDaysBefore: license.alertDaysBefore || 30,
    });
    setIsEditOpen(true);
  };

  const handleDelete = (license: License) => {
    setSelectedLicense(license);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedLicense) return;
    deleteLicense.mutate(selectedLicense.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedLicense(null);
      },
    });
  };

  const filteredLicenses = licenses?.filter(license => {
    const fornecedor = fornecedores?.find((f: any) => f.id === license.fornecedorId);
    const produto = produtos?.find((p: any) => p.id === license.produtoId);
    const term = searchTerm.toLowerCase();
    return (
      fornecedor?.nome.toLowerCase().includes(term) ||
      produto?.nome.toLowerCase().includes(term) ||
      license.key.toLowerCase().includes(term) ||
      (license.serviceCategory || "").toLowerCase().includes(term)
    );
  });

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Licenças</h1>
          <p className="text-muted-foreground mt-1">Rastreie licenças de software e assinaturas.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar licenças..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button variant="outline" onClick={() => exportLicenses.mutate()} disabled={exportLicenses.isPending}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/25">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Licença
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Licença</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-visible">
                  <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave da Licença</FormLabel>
                        <FormControl>
                          <Input placeholder="XXXX-YYYY-ZZZZ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fornecedorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fornecedor</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val ? parseInt(val) : null)} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um fornecedor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper">
                            {fornecedores?.map((fornecedor: any) => (
                              <SelectItem key={fornecedor.id} value={fornecedor.id.toString()}>{fornecedor.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="serviceCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria de Serviço</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Locação PABX, Nuvem, Suporte..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contractType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Contrato</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "new"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper">
                              <SelectItem value="new">Novo</SelectItem>
                              <SelectItem value="renewal">Renovação</SelectItem>
                              <SelectItem value="trial">Trial</SelectItem>
                              <SelectItem value="perpetual">Perpétuo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="renewalType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Renovação</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "annual"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper">
                              <SelectItem value="none">Nenhuma</SelectItem>
                              <SelectItem value="annual">Anual</SelectItem>
                              <SelectItem value="monthly">Mensal</SelectItem>
                              <SelectItem value="custom">Customizada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="expirationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Expiração</FormLabel>
                          <FormControl>
                            <Input type="date" value={(field.value ? (typeof field.value === "string" ? field.value : new Date(field.value).toISOString().split("T")[0]) : "") as string} onChange={e => field.onChange(e.target.value || null)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="alertDaysBefore"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alertar com (dias)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} value={field.value ?? 30} onChange={e => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status da Licença</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "active"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper">
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="expired">Expirado</SelectItem>
                            <SelectItem value="suspended">Suspenso</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="produtoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Produto</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val ? parseInt(val) : null)} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper">
                            {produtos?.map((produto: any) => (
                              <SelectItem key={produto.id} value={produto.id.toString()}>{produto.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente (Opcional)</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={clients?.map((client: any) => ({ value: String(client.id), label: client.name })) || []}
                            value={field.value?.toString() || ""}
                            onChange={(val) => field.onChange(val ? parseInt(val) : null)}
                            placeholder="Selecione um cliente"
                            searchPlaceholder="Buscar cliente..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observação</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Adicione observações sobre esta licença..." 
                            className="resize-none" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createLicense.isPending}>
                      {createLicense.isPending ? "Criando..." : "Criar Licença"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Chave</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Renovação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">Carregando...</TableCell>
              </TableRow>
            ) : filteredLicenses?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">Nenhuma licença encontrada.</TableCell>
              </TableRow>
            ) : (
              filteredLicenses?.map((license) => (
                <TableRow key={license.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium text-sm">{license.key}</TableCell>
                  <TableCell>
                    {fornecedores?.find((f: any) => f.id === license.fornecedorId)?.nome || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    {license.serviceCategory || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-sm">
                      {license.contractType === "new" ? "Novo" :
                       license.contractType === "renewal" ? "Renovação" :
                       license.contractType === "trial" ? "Trial" :
                       license.contractType === "perpetual" ? "Perpétuo" :
                       license.contractType || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-sm">
                      {license.renewalType === "none" ? "Nenhuma" :
                       license.renewalType === "annual" ? "Anual" :
                       license.renewalType === "monthly" ? "Mensal" :
                       license.renewalType === "custom" ? "Customizada" :
                       license.renewalType || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {license.status === 'active' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                       license.status === 'expired' ? <XCircle className="w-4 h-4 text-red-500" /> :
                       <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      <span className="capitalize text-sm">{license.status === 'active' ? 'Ativo' : license.status === 'expired' ? 'Expirado' : 'Suspenso'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {produtos?.find((p: any) => p.id === license.produtoId)?.nome || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    {clients?.find((c: any) => c.id === license.clientId)?.name || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={8} collisionPadding={0} avoidCollisions={false} className="z-[100]">
                        <DropdownMenuItem onClick={() => handleEdit(license)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(license)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <DataPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Licença</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4 overflow-visible">
              <FormField
                control={editForm.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave da Licença</FormLabel>
                    <FormControl>
                      <Input placeholder="XXXX-YYYY-ZZZZ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="fornecedorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val ? parseInt(val) : null)} value={field.value?.toString() || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        {fornecedores?.map((fornecedor: any) => (
                          <SelectItem key={fornecedor.id} value={fornecedor.id.toString()}>{fornecedor.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="serviceCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria de Serviço</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Locação PABX, Nuvem, Suporte..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Contrato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "new"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="popper">
                          <SelectItem value="new">Novo</SelectItem>
                          <SelectItem value="renewal">Renovação</SelectItem>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="perpetual">Perpétuo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="renewalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Renovação</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "annual"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="popper">
                          <SelectItem value="none">Nenhuma</SelectItem>
                          <SelectItem value="annual">Anual</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="custom">Customizada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Expiração</FormLabel>
                      <FormControl>
                        <Input type="date" value={field.value ? (typeof field.value === "string" ? field.value : new Date(field.value).toISOString().split("T")[0]) : ""} onChange={e => field.onChange(e.target.value || null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="alertDaysBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alertar com (dias)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} value={field.value ?? 30} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status da Licença</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "active"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="expired">Expirado</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="produtoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val ? parseInt(val) : null)} value={field.value?.toString() || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        {produtos?.map((produto: any) => (
                          <SelectItem key={produto.id} value={produto.id.toString()}>{produto.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (Opcional)</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={clients?.map((client: any) => ({ value: String(client.id), label: client.name })) || []}
                        value={field.value?.toString() || ""}
                        onChange={(val) => field.onChange(val ? parseInt(val) : null)}
                        placeholder="Selecione um cliente"
                        searchPlaceholder="Buscar cliente..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Adicione observações sobre esta licença..." 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateLicense.isPending}>
                  {updateLicense.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta licença? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
