import { Switch, Route } from "wouter";
import UploadTaxFormPage from "./pages/upload-tax-form";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

import DealersPage from "@/pages/dealers";
import FindPage from "@/pages/find";
import ApplyPage from "@/pages/apply";
import WarrantyPage from "@/pages/warranty";
import AdminPage from "@/pages/admin";
import OrderPage from "@/pages/order";
import OrderConfirmationPage from "@/pages/order-confirmation";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dealers" component={DealersPage} />
      <Route path="/find" component={FindPage} />
      <Route path="/apply" component={ApplyPage} />
      <Route path="/warranty" component={WarrantyPage} />
      <Route path="/order" component={OrderPage} />
      <Route path="/order-confirmation" component={OrderConfirmationPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/upload-tax-form" component={UploadTaxFormPage} />
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
