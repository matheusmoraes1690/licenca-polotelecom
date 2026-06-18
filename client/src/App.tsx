import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useBrandingSettings } from "@/hooks/use-settings";
import { useEffect } from "react";

import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients";
import ClientDetailsPage from "@/pages/client-details";
import MilvusImportPage from "@/pages/milvus-import";
import MilvusSettingsPage from "@/pages/milvus-settings";
import LicensesPage from "@/pages/licenses";
import FornecedoresPage from "@/pages/fornecedores";
import ProdutosPage from "@/pages/produtos";
import CredentialsPage from "@/pages/credentials";
import UsersSettingsPage from "@/pages/users-settings";
import SettingsPage from "@/pages/settings-page";
import VaultPage from "@/pages/vault";
import VaultCredentialPage from "@/pages/vault-credential";
import AuditPage from "@/pages/audit";
import TrashPage from "@/pages/trash";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Routes */}
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/clients">
        {() => <ProtectedRoute component={ClientsPage} />}
      </Route>
      <Route path="/clients/import-milvus">
        {() => <ProtectedRoute component={MilvusImportPage} />}
      </Route>
      <Route path="/clients/:id">
        {() => <ProtectedRoute component={ClientDetailsPage} />}
      </Route>
      <Route path="/licenses">
        {() => <ProtectedRoute component={LicensesPage} />}
      </Route>
      <Route path="/fornecedores">
        {() => <ProtectedRoute component={FornecedoresPage} />}
      </Route>
      <Route path="/produtos">
        {() => <ProtectedRoute component={ProdutosPage} />}
      </Route>
      <Route path="/credentials">
        {() => <ProtectedRoute component={CredentialsPage} />}
      </Route>
      <Route path="/settings/users">
        {() => <ProtectedRoute component={UsersSettingsPage} />}
      </Route>
      <Route path="/vault">
        {() => <ProtectedRoute component={VaultPage} />}
      </Route>
      <Route path="/vault/new">
        {() => <ProtectedRoute component={VaultCredentialPage} />}
      </Route>
      <Route path="/vault/:id">
        {() => <ProtectedRoute component={VaultCredentialPage} />}
      </Route>
      <Route path="/audit">
        {() => <ProtectedRoute component={AuditPage} />}
      </Route>
      <Route path="/trash">
        {() => <ProtectedRoute component={TrashPage} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/settings/milvus">
        {() => <ProtectedRoute component={MilvusSettingsPage} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function FaviconUpdater() {
  const branding = useBrandingSettings();
  useEffect(() => {
    if (branding.appName) {
      document.title = branding.appName + " - License Manager";
    }
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (branding.favicon) {
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.type = "image/x-icon";
      link.href = branding.favicon;
    }
  }, [branding]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <FaviconUpdater />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
