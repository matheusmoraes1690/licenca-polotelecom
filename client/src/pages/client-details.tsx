import { useClient, useDeleteClient } from "@/hooks/use-clients";
import { useLicenses } from "@/hooks/use-licenses";
import { useHardware } from "@/hooks/use-hardware";
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
  Monitor,
  CheckCircle,
  AlertTriangle,
  XCircle
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

export default function ClientDetailsPage() {
  const [match, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  
  const { data: client, isLoading: isClientLoading } = useClient(id);
  const { data: licenses } = useLicenses({ clientId: id.toString() });
  const { data: hardware } = useHardware({ clientId: id.toString() });
  
  const deleteClient = useDeleteClient();

  const handleDelete = () => {
    deleteClient.mutate(id, {
      onSuccess: () => setLocation("/clients"),
    });
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                  {client.status}
                </span>
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
          <Tabs defaultValue="licenses" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border/50 rounded-none h-auto p-0 mb-6">
              <TabsTrigger 
                value="licenses" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                Licenses ({licenses?.length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="hardware" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                Hardware ({hardware?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="licenses" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {licenses?.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No licenses found</h3>
                  <p className="text-muted-foreground">Assign a license to this client to see it here.</p>
                </div>
              ) : (
                licenses?.map(license => (
                  <Card key={license.id} className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold">{license.name}</h4>
                          <p className="text-sm text-muted-foreground font-mono">{license.key}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          {license.status === 'active' ? <CheckCircle className="w-4 h-4 text-green-500" /> : 
                           license.status === 'expired' ? <XCircle className="w-4 h-4 text-red-500" /> :
                           <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          <span className="text-sm font-medium capitalize">{license.status}</span>
                        </div>
                        {license.expirationDate && (
                          <p className="text-xs text-muted-foreground">
                            Expires: {format(new Date(license.expirationDate), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="hardware" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {hardware?.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                  <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No hardware found</h3>
                  <p className="text-muted-foreground">Register hardware to this client to see it here.</p>
                </div>
              ) : (
                hardware?.map(item => (
                  <Card key={item.id} className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                          <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold">{item.name}</h4>
                          <p className="text-sm text-muted-foreground font-mono">{item.serialNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-0.5 bg-muted rounded text-xs font-medium mb-1 capitalize">
                          {item.type}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {item.status}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
