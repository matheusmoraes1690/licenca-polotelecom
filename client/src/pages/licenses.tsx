import { useState } from "react";
import { useLicenses, useCreateLicense } from "@/hooks/use-licenses";
import { useClients } from "@/hooks/use-clients";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLicenseSchema, type CreateLicenseRequest } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";

export default function LicensesPage() {
  const { data: licenses, isLoading } = useLicenses();
  const { data: clients } = useClients();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createLicense = useCreateLicense();

  const form = useForm<CreateLicenseRequest>({
    resolver: zodResolver(insertLicenseSchema),
    defaultValues: {
      name: "",
      key: "",
      type: "subscription",
      status: "active",
      cost: 0,
      clientId: null,
      notes: "",
    },
  });

  const onSubmit = (data: CreateLicenseRequest) => {
    createLicense.mutate(data, {
      onSuccess: () => {
        setIsCreateOpen(false);
        form.reset();
      },
    });
  };

  const filteredLicenses = licenses?.filter(license => 
    license.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Licenses</h1>
          <p className="text-muted-foreground mt-1">Track software licenses and subscriptions.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search licenses..." 
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/25">
                <Plus className="w-4 h-4 mr-2" />
                Add License
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New License</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Software Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Adobe Creative Cloud" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Key</FormLabel>
                        <FormControl>
                          <Input placeholder="XXXX-YYYY-ZZZZ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="subscription">Subscription</SelectItem>
                              <SelectItem value="perpetual">Perpetual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purchaseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expirationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiration Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Client</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val ? parseInt(val) : null)} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map(client => (
                              <SelectItem key={client.id} value={client.id.toString()}>{client.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createLicense.isPending}>
                      {createLicense.isPending ? "Creating..." : "Create License"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Software Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : filteredLicenses?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No licenses found.</TableCell>
              </TableRow>
            ) : (
              filteredLicenses?.map((license) => (
                <TableRow key={license.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">{license.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{license.key}</TableCell>
                  <TableCell>
                    {clients?.find(c => c.id === license.clientId)?.name || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>{format(new Date(license.purchaseDate), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {license.expirationDate ? format(new Date(license.expirationDate), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {license.status === 'active' ? <CheckCircle className="w-4 h-4 text-green-500" /> : 
                       license.status === 'expired' ? <XCircle className="w-4 h-4 text-red-500" /> :
                       <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      <span className="capitalize text-sm">{license.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {license.cost ? `$${license.cost.toFixed(2)}` : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}
