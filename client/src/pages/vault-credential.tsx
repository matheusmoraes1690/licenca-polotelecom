import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/layout";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/use-clients";
import {
  useCredential,
  useCredentialCategories,
  useCredentialCustomFields,
  useCreateCredential,
  useUpdateCredential,
  useCredentialDocuments,
  useCreateCredentialDocument,
  useDeleteCredentialDocument,
} from "@/hooks/use-vault";
import {
  ArrowLeft,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Shield,
  X,
  FileText,
  File,
  Upload,
  Link as LinkIcon,
  Download,
  ExternalLink,
} from "lucide-react";

function generatePassword(options: {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
}): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const ambiguous = "0O1lI";

  let chars = "";
  if (options.lowercase) chars += lowercase;
  if (options.uppercase) chars += uppercase;
  if (options.numbers) chars += numbers;
  if (options.symbols) chars += symbols;

  if (options.avoidAmbiguous) {
    chars = chars.split("").filter((c) => !ambiguous.includes(c)).join("");
  }

  if (!chars) chars = lowercase;

  let password = "";
  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);
  for (let i = 0; i < options.length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

function passwordStrength(password: string): { label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: "Fraca", color: "bg-red-500" };
  if (score <= 3) return { label: "Média", color: "bg-amber-500" };
  if (score <= 4) return { label: "Forte", color: "bg-emerald-500" };
  return { label: "Muito forte", color: "bg-emerald-600" };
}

interface CustomFieldForm {
  id?: number;
  name: string;
  value: string;
  isEncrypted: boolean;
}

export default function VaultCredentialPage() {
  const params = useParams<{ id?: string }>();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const prefillClientId = searchParams.get("clientId");

  const credentialId = params.id ? Number(params.id) : null;
  const isNew = !credentialId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: existingCredential } = useCredential(isNew ? null : credentialId);
  const { data: categories } = useCredentialCategories();
  const { data: existingCustomFields } = useCredentialCustomFields(isNew ? null : credentialId);
  const { data: clientsData } = useClients();
  const clients = clientsData?.data;

  const createMutation = useCreateCredential();
  const updateMutation = useUpdateCredential();

  // Credential Documents (only for existing credentials)
  const { data: docList } = useCredentialDocuments(credentialId || 0);
  const createDocument = useCreateCredentialDocument(credentialId || 0);
  const deleteDocument = useDeleteCredentialDocument(credentialId || 0);

  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [docType, setDocType] = useState<'file' | 'link'>('file');
  const [docForm, setDocForm] = useState({ name: "", url: "" });
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("active");
  const [showPassword, setShowPassword] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFieldForm[]>([]);

  // Password generator
  const [genLength, setGenLength] = useState(16);
  const [genUppercase, setGenUppercase] = useState(true);
  const [genLowercase, setGenLowercase] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genAvoidAmbiguous, setGenAvoidAmbiguous] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);

  useEffect(() => {
    if (existingCredential && !isNew) {
      setTitle(existingCredential.title || "");
      setClientId(String(existingCredential.clientId));
      setCategoryId(existingCredential.categoryId ? String(existingCredential.categoryId) : "");
      setUrl(existingCredential.url || "");
      setUsername(existingCredential.username || "");
      setTags(existingCredential.tags || "");
      setStatus(existingCredential.status);
    } else if (isNew && prefillClientId) {
      setClientId(prefillClientId);
    }
  }, [existingCredential, isNew, prefillClientId]);

  useEffect(() => {
    if (existingCustomFields && !isNew) {
      setCustomFields(existingCustomFields.map((f) => ({ id: f.id, name: f.name, value: f.value || "", isEncrypted: f.isEncrypted })));
    }
  }, [existingCustomFields, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientId) {
      toast({ title: "Campos obrigatórios", description: "Título e cliente são obrigatórios.", variant: "destructive" });
      return;
    }

    const data = {
      clientId: Number(clientId),
      categoryId: categoryId ? Number(categoryId) : null,
      title,
      url: url || null,
      username: username || null,
      password: password || null,
      notes: notes || null,
      tags: tags || null,
      status,
      customFields: customFields.map((f, i) => ({ name: f.name, value: f.value, isEncrypted: f.isEncrypted, order: i })),
    };

    try {
      if (isNew) {
        await createMutation.mutateAsync(data);
        toast({ title: "Criado", description: "Credencial criada com sucesso." });
      } else {
        await updateMutation.mutateAsync({ id: credentialId!, data });
        toast({ title: "Atualizado", description: "Credencial atualizada com sucesso." });
      }
      setLocation("/vault");
    } catch {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { name: "", value: "", isEncrypted: false }]);
  };

  const updateCustomField = (index: number, field: Partial<CustomFieldForm>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...field };
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const applyGeneratedPassword = () => {
    const pwd = generatePassword({
      length: genLength,
      uppercase: genUppercase,
      lowercase: genLowercase,
      numbers: genNumbers,
      symbols: genSymbols,
      avoidAmbiguous: genAvoidAmbiguous,
    });
    setPassword(pwd);
    setShowGenerator(false);
  };

  const strength = passwordStrength(password);

  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDocFile(file);
      setDocForm({ ...docForm, name: file.name });
    }
  };

  const handleCreateDoc = async () => {
    if (docType === 'link') {
      if (!docForm.name || !docForm.url) return;
      createDocument.mutate({
        name: docForm.name,
        type: 'link',
        url: docForm.url,
        fileType: null,
        size: null,
      }, {
        onSuccess: () => {
          setIsDocDialogOpen(false);
          setDocForm({ name: "", url: "" });
        }
      });
    } else {
      if (!selectedDocFile) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const fileType = selectedDocFile.name.split('.').pop() || '';
        createDocument.mutate({
          name: selectedDocFile.name,
          type: 'file',
          url: base64,
          fileType: fileType,
          size: selectedDocFile.size,
        }, {
          onSuccess: () => {
            setIsDocDialogOpen(false);
            setDocForm({ name: "", url: "" });
            setSelectedDocFile(null);
          }
        });
      };
      reader.readAsDataURL(selectedDocFile);
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

  const handlePreviewDoc = (doc: any) => {
    if (doc.type === 'file' && doc.fileType === 'pdf') {
      window.open(`/api/credential-documents/${doc.id}/file`, '_blank');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/vault")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {isNew ? "Nova Credencial" : "Editar Credencial"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Informações Básicas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Servidor Principal" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <SearchableSelect
                  options={clients?.map((c) => ({ value: String(c.id), label: c.name })) || []}
                  value={clientId}
                  onChange={setClientId}
                  placeholder="Selecione um cliente"
                  searchPlaceholder="Buscar cliente..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL / Endereço</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemplo.com ou IP" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-muted rounded">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {password && (
                        <button type="button" onClick={() => navigator.clipboard.writeText(password)} className="p-1 hover:bg-muted rounded">
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setShowGenerator(!showGenerator)}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                {password && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(password.length / 32) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{strength.label}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Password Generator */}
            {showGenerator && (
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-sm">Gerador de Senha</h3>
                <div className="flex items-center gap-4">
                  <Label className="text-sm whitespace-nowrap">Tamanho: {genLength}</Label>
                  <input
                    type="range"
                    min="8"
                    max="64"
                    value={genLength}
                    onChange={(e) => setGenLength(Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={genUppercase} onChange={(e) => setGenUppercase(e.target.checked)} />
                    Maiúsculas
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={genLowercase} onChange={(e) => setGenLowercase(e.target.checked)} />
                    Minúsculas
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={genNumbers} onChange={(e) => setGenNumbers(e.target.checked)} />
                    Números
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} />
                    Símbolos
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={genAvoidAmbiguous} onChange={(e) => setGenAvoidAmbiguous(e.target.checked)} />
                    Evitar ambíguos
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={applyGeneratedPassword}>
                    Gerar e Aplicar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowGenerator(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (criptografadas)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="produção, aws, crítico" />
              {tags && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.split(",").map((tag, i) => tag.trim() && (
                    <Badge key={i} variant="outline">{tag.trim()}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom Fields */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Campos Personalizados</h2>
              <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Campo
              </Button>
            </div>

            {customFields.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum campo personalizado adicionado.</p>
            )}

            {customFields.map((field, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 bg-muted/50 rounded-lg">
                <div className="md:col-span-3">
                  <Label className="text-xs">Nome</Label>
                  <Input value={field.name} onChange={(e) => updateCustomField(index, { name: e.target.value })} placeholder="Ex: IP, Porta" />
                </div>
                <div className="md:col-span-6">
                  <Label className="text-xs">Valor</Label>
                  <Input value={field.value} onChange={(e) => updateCustomField(index, { value: e.target.value })} />
                </div>
                <div className="md:col-span-2 flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id={`encrypt-${index}`}
                    checked={field.isEncrypted}
                    onChange={(e) => updateCustomField(index, { isEncrypted: e.target.checked })}
                  />
                  <Label htmlFor={`encrypt-${index}`} className="text-xs cursor-pointer">Criptografar</Label>
                </div>
                <div className="md:col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomField(index)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Documents */}
          {!isNew && (
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Documentos Anexos</h2>
                <Dialog open={isDocDialogOpen} onOpenChange={(open) => {
                  setIsDocDialogOpen(open);
                  if (!open) {
                    setDocForm({ name: "", url: "" });
                    setSelectedDocFile(null);
                    setDocType('file');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Documento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={docType === 'file' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => setDocType('file')}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Arquivo
                        </Button>
                        <Button
                          type="button"
                          variant={docType === 'link' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => setDocType('link')}
                        >
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Link Externo
                        </Button>
                      </div>

                      {docType === 'file' ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="doc-file">Selecionar Arquivo</Label>
                            <Input
                              id="doc-file"
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                              onChange={handleDocFileSelect}
                            />
                            <p className="text-xs text-muted-foreground">
                              Formatos aceitos: PDF, Word, Excel, ZIP
                            </p>
                          </div>
                          {selectedDocFile && (
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm font-medium">{selectedDocFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(selectedDocFile.size)}
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
                              value={docForm.name}
                              onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="doc-url">URL</Label>
                            <Input
                              id="doc-url"
                              placeholder="https://exemplo.com/documento"
                              value={docForm.url}
                              onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
                            />
                          </div>
                        </>
                      )}

                      <DialogFooter>
                        <Button
                          type="button"
                          onClick={handleCreateDoc}
                          disabled={
                            (docType === 'file' && !selectedDocFile) ||
                            (docType === 'link' && (!docForm.name || !docForm.url)) ||
                            createDocument.isPending
                          }
                        >
                          {createDocument.isPending ? "Adicionando..." : "Adicionar"}
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {docList?.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
              ) : (
                <div className="space-y-2">
                  {docList?.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-polo-red-light text-polo-red flex items-center justify-center shrink-0">
                          {doc.type === 'link' ? <LinkIcon className="w-4 h-4" /> : getFileIcon(doc.fileType)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                      <div className="flex items-center gap-1 ml-2">
                        {doc.type === 'file' && doc.fileType === 'pdf' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewDoc(doc)}
                            title="Visualizar PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {doc.type === 'link' ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 px-2 text-xs font-medium rounded-md hover:bg-muted transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <a
                            href={`/api/credential-documents/${doc.id}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 px-2 text-xs font-medium rounded-md hover:bg-muted transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocument.mutate(doc.id)}
                          disabled={deleteDocument.isPending}
                          className="text-red-600 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" className="min-w-[140px]">
              {isNew ? "Criar Credencial" : "Salvar Alterações"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setLocation("/vault")}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
