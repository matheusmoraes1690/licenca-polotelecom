import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients";
import ClientDetailsPage from "@/pages/client-details";
import LicensesPage from "@/pages/licenses";
import HardwarePage from "@/pages/hardware";
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
      <Route path="/clients/:id">
        {() => <ProtectedRoute component={ClientDetailsPage} />}
      </Route>
      <Route path="/licenses">
        {() => <ProtectedRoute component={LicensesPage} />}
      </Route>
      <Route path="/hardware">
        {() => <ProtectedRoute component={HardwarePage} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
