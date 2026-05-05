import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/protected-route";
import { showOutOfCreditsModal } from "@/components/out-of-credits-modal";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import SmartInput from "@/pages/smart-input";
import Planner from "@/pages/planner";
import Chat from "@/pages/chat";
import Insights from "@/pages/insights";

function isOutOfCreditsError(error: unknown): boolean {
  const e = error as { status?: number; data?: { code?: string } } | null;
  if (!e) return false;
  if (e.status === 402) return true;
  if (e.data?.code === "OUT_OF_CREDITS") return true;
  return false;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isOutOfCreditsError(error)) showOutOfCreditsModal();
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isOutOfCreditsError(error)) showOutOfCreditsModal();
    },
  }),
});

function CreditRefresher() {
  const { user, refresh } = useAuth();
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => { void refresh(); }, 15000);
    return () => clearInterval(id);
  }, [user, refresh]);
  return null;
}

function ProtectedShell({ Component }: { Component: React.ComponentType }) {
  return (
    <ProtectedRoute>
      <CreditRefresher />
      <Layout>
        <Component />
      </Layout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicOnlyRoute><Landing /></PublicOnlyRoute>
      </Route>
      <Route path="/login">
        <PublicOnlyRoute><Login /></PublicOnlyRoute>
      </Route>
      <Route path="/register">
        <PublicOnlyRoute><Register /></PublicOnlyRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedShell Component={Dashboard} />
      </Route>
      <Route path="/tasks">
        <ProtectedShell Component={Tasks} />
      </Route>
      <Route path="/input">
        <ProtectedShell Component={SmartInput} />
      </Route>
      <Route path="/planner">
        <ProtectedShell Component={Planner} />
      </Route>
      <Route path="/chat">
        <ProtectedShell Component={Chat} />
      </Route>
      <Route path="/insights">
        <ProtectedShell Component={Insights} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
