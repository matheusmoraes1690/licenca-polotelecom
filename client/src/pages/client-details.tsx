import { useClient, useDeleteClient, useUpdateClient } from "@/hooks/use-clients";
import { useLicenses, useLicensesWithDetails } from "@/hooks/use-licenses";
import { useClientDocuments, useCreateClientDocument, useDeleteClientDocument } from "@/hooks/use-client-documents";
import { useCredentials, useCopyPassword, useRevealPassword } from "@/hooks/use-vault";
import { Layout } from "@/components/layout";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Trash2,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  ExternalLink,
  Upload,
  Link as LinkIcon,
  Download,
  File,
  KeyRound
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ClientDetailsPage() {
  const [match, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { toast } = useToast();
  
  const { data: client, isLoading: isClientLoading } = useClient(id);
  const { data: licensesData } = useLicensesWithDetails({ clientId: id.toString() });
  const licenses = licensesData?.data;
  const { data: documentList } = useClientDocuments(id);
  const { data: vaultCredentialsData } = useCredentials({ clientId: id });
  const vaultCredentials = vaultCredentialsData?.data;

  const deleteClient = useDeleteClient();
  const updateClient = useUpdateClient();
  const createDocument = useCreateClientDocument(id);
  const deleteDocument = useDeleteClientDocument(id);
  const copyPassword = useCopyPassword();
  const revealPassword = useRevealPassword();

  const [revealedVault, setRevealedVault] = useState<Map<number, string>>(new Map());

  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [documentType, setDocumentType] = useState<'file' | 'link'>('file');
  const [documentForm, setDocumentForm] = useState({
    name: "",
    url: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDelete = () => {
    deleteClient.mutate(id, {
      onSuccess: () => setLocation("/clients"),
    });
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Toast handled by the copy action
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleVaultPassword = async (credId: number) => {
    if (revealedVault.has(credId)) {
      setRevealedVault(prev => {
        const next = new Map(prev);
        next.delete(credId);
        return next;
      });
    } else {
      try {
        const result = await revealPassword.mutateAsync(credId);
        setRevealedVault(prev => new Map(prev).set(credId, result.password));
      } catch (err: any) {
        toast({ title: "Erro", description: err?.message || "Não foi possível revelar a senha.", variant: "destructive" });
      }
    }
  };

  const copyVaultPassword = async (credId: number) => {
    try {
      const result = await copyPassword.mutateAsync(credId);
      navigator.clipboard.writeText(result.password);
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Não foi possível copiar a senha.", variant: "destructive" });
    }
  };

  const handleToggleStatus = () => {
    const newStatus = client?.status === 'active' ? 'inactive' : 'active';
    updateClient.mutate({ id, status: newStatus });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDocumentForm({ ...documentForm, name: file.name });
    }
  };

  const handleCreateDocument = async () => {
    if (documentType === 'link') {
      if (!documentForm.name || !documentForm.url) return;
      createDocument.mutate({
        name: documentForm.name,
        type: 'link',
        url: documentForm.url,
        fileType: null,
        size: null
      }, {
        onSuccess: () => {
          setIsDocumentDialogOpen(false);
          setDocumentForm({ name: "", url: "" });
        }
      });
    } else {
      if (!selectedFile) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const fileType = selectedFile.name.split('.').pop() || '';
        createDocument.mutate({
          name: selectedFile.name,
          type: 'file',
          url: base64,
          fileType: fileType,
          size: selectedFile.size
        }, {
          onSuccess: () => {
            setIsDocumentDialogOpen(false);
            setDocumentForm({ name: "", url: "" });
            setSelectedFile(null);
          }
        });
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDeleteDocument = (documentId: number) => {
    deleteDocument.mutate(documentId);
  };

  const handleDownloadDocument = (doc: any) => {
    if (doc.type === 'link') {
      window.open(doc.url, '_blank');
    } else {
      // Use the server endpoint for files
      window.open(`/api/documents/${doc.id}/file`, '_blank');
    }
  };

  const handlePreviewDocument = (doc: any) => {
    if (doc.type === 'file' && doc.fileType === 'pdf') {
      // Use the server endpoint for PDF preview
      window.open(`/api/documents/${doc.id}/file`, '_blank');
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-5 h-5" />;
    const type = fileType.toLowerCase();
    if (type === 'pdf') return <FileText className="w-5 h-5" />;
    if (['doc', 'docx'].includes(type)) return <FileText className="w-5 h-5" />;
    if (['xls', 'xlsx'].includes(type)) return <FileText className="w-5 h-5" />;
    if (type === 'zip') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isClientLoading) return <div className="p-10">Loading...</div>;
  if (!client) return <div className="p-10">Client not found</div>;

  return (
    <Layout>
      <div className="mb-6">
        <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Clients
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Client Info */}
        <div className="w-full lg:w-1/3 space-y-6">
          <Card className="border-border/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-24 w-24 mb-4 border-4 border-muted">
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/10 to-primary/30 text-primary">
                    {client.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold font-display">{client.name}</h1>
                <button
                  onClick={handleToggleStatus}
                  disabled={updateClient.isPending}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mt-2 transition-all hover:scale-105 cursor-pointer ${
                    client.status === 'active'
                      ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/50'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                  } ${updateClient.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Clique para alterar o status"
                >
                  {client.status === 'active' ? '✓ ATIVO' : '✕ DESATIVADO'}
                </button>
              </div>

              <div className="space-y-4 py-6 border-t border-border/50">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{client.phone}</p>
                    </div>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">{client.address}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border/50">
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Client
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the client
                        and associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Assets */}
        <div className="flex-1">
          <Tabs defaultValue="vault" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border/50 rounded-none h-auto p-0 mb-6">
              <TabsTrigger 
                value="vault" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Cofre ({vaultCredentials?.length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="licenses" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                Licenses ({licenses?.length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="documentation" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                Documentação
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vault" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Credenciais do Cofre</h3>
                <Button size="sm" className="bg-polo-red hover:bg-polo-red-dark" onClick={() => setLocation(`/vault/new?clientId=${id}`)}>
                  <Plus className="w-4 h-4 mr-2" /> Nova Credencial
                </Button>
              </div>
              {vaultCredentials?.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                  <KeyRound className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma credencial no cofre</h3>
                  <p className="text-muted-foreground">Cadastre credenciais de acesso para este cliente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vaultCredentials?.map((cred: any) => (
                    <Card key={cred.id} className="border-border/50 hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-polo-red-light text-polo-red flex items-center justify-center">
                              <KeyRound className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-base">{cred.title}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cred.status === 'active' ? 'bg-[#E8F5E9] text-[#00C853] dark:bg-green-900/30 dark:text-green-400' : 'bg-[#F7F8FC] text-[#555577] dark:bg-muted dark:text-muted-foreground'}`}>
                                  {cred.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                              {cred.url && (
                                <a
                                  href={cred.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-polo-red hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  {cred.url}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8} collisionPadding={0} avoidCollisions={false} className="z-[100]">
                              <DropdownMenuItem onClick={() => setLocation(`/vault/${cred.id}`)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="space-y-2.5">
                          {cred.username && (
                            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1">Usuário</p>
                                <p className="font-mono text-sm">{cred.username}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(cred.username, "Usuário copiado")}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          {cred.encryptedPassword && (
                            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1">Senha</p>
                                <p className="font-mono text-sm">
                                  {revealedVault.has(cred.id) ? revealedVault.get(cred.id) : "••••••••••••"}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleVaultPassword(cred.id)}
                                className="h-8 w-8 p-0"
                              >
                                {revealedVault.has(cred.id) ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyVaultPassword(cred.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="licenses" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {licenses?.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma licença encontrada</h3>
                  <p className="text-muted-foreground">Atribua uma licença a este cliente para vê-la aqui.</p>
                </div>
              ) : (
                licenses?.map((license: any) => (
                  <Card key={license.id} className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold">{license.key}</h4>
                            <p className="text-sm text-muted-foreground font-mono">{license.notes || 'Sem observações'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2 mb-1">
                            {license.status === 'active' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                             license.status === 'expired' ? <XCircle className="w-4 h-4 text-red-500" /> :
                             <AlertTriangle className="w-4 h-4 text-amber-500" />}
                            <span className="text-sm font-medium capitalize">{license.status}</span>
                          </div>
                          {license.dataAtualizacao && (
                            <p className="text-xs text-muted-foreground">
                              Atualizado: {format(new Date(license.dataAtualizacao), 'dd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-semibold">Fornecedor</p>
                          <p className="text-sm font-medium">
                            {license.fornecedor?.nome || <span className="text-muted-foreground">-</span>}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-semibold">Categoria de Serviço</p>
                          <p className="text-sm font-medium">
                            {license.serviceCategory || <span className="text-muted-foreground">-</span>}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-semibold">Tipo de Contrato</p>
                          <p className="text-sm font-medium capitalize">
                            {license.contractType || <span className="text-muted-foreground">-</span>}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-semibold">Renovação</p>
                          <p className="text-sm font-medium capitalize">
                            {license.renewalType || <span className="text-muted-foreground">-</span>}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-semibold">Produto</p>
                          <p className="text-sm font-medium">
                            {license.produto?.nome || <span className="text-muted-foreground">-</span>}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-semibold">Observação</p>
                          <p className="text-sm font-medium">
                            {license.notes || <span className="text-muted-foreground">-</span>}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="documentation" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Documentos</h3>
                <Dialog open={isDocumentDialogOpen} onOpenChange={(open) => {
                  setIsDocumentDialogOpen(open);
                  if (!open) {
                    setDocumentForm({ name: "", url: "" });
                    setSelectedFile(null);
                    setDocumentType('file');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Documento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Novo Documento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={documentType === 'file' ? 'default' : 'outline'}
                          onClick={() => setDocumentType('file')}
                          className="flex-1"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Arquivo
                        </Button>
                        <Button
                          type="button"
                          variant={documentType === 'link' ? 'default' : 'outline'}
                          onClick={() => setDocumentType('link')}
                          className="flex-1"
                        >
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Link Externo
                        </Button>
                      </div>

                      {documentType === 'file' ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="file">Selecionar Arquivo</Label>
                            <Input
                              id="file"
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                              onChange={handleFileSelect}
                            />
                            <p className="text-xs text-muted-foreground">
                              Formatos aceitos: PDF, Word, Excel, ZIP
                            </p>
                          </div>
                          {selectedFile && (
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm font-medium">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(selectedFile.size)}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="doc-name">Nome do Link</Label>
                            <Input
                              id="doc-name"
                              placeholder="Ex: Contrato de Serviço"
                              value={documentForm.name}
                              onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="doc-url">URL</Label>
                            <Input
                              id="doc-url"
                              placeholder="https://exemplo.com/documento"
                              value={documentForm.url}
                              onChange={(e) => setDocumentForm({ ...documentForm, url: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateDocument}
                        disabled={
                          (documentType === 'file' && !selectedFile) ||
                          (documentType === 'link' && (!documentForm.name || !documentForm.url)) ||
                          createDocument.isPending
                        }
                      >
                        Adicionar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {documentList?.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma documentação encontrada</h3>
                  <p className="text-muted-foreground">Adicione documentos para este cliente para vê-los aqui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documentList?.map((doc) => (
                    <Card key={doc.id} className="border-border/50 hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              doc.type === 'link' 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-purple-100 text-purple-600'
                            }`}>
                              {doc.type === 'link' ? (
                                <LinkIcon className="w-5 h-5" />
                              ) : (
                                getFileIcon(doc.fileType)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-base truncate">{doc.name}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className="capitalize">{doc.type === 'link' ? 'Link Externo' : doc.fileType?.toUpperCase()}</span>
                                {doc.size && (
                                  <>
                                    <span>•</span>
                                    <span>{formatFileSize(doc.size)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.type === 'file' && doc.fileType === 'pdf' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreviewDocument(doc)}
                                title="Visualizar PDF"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc)}
                              title={doc.type === 'link' ? 'Abrir link' : 'Baixar arquivo'}
                            >
                              {doc.type === 'link' ? (
                                <ExternalLink className="w-4 h-4" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O documento será permanentemente excluído.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
