import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import DeclarationsPage from "./pages/DeclarationsPage";
import CommissionsPage from "./pages/CommissionsPage";
import SettingsPage from "./pages/SettingsPage";
import SummaryPage from "./pages/SummaryPage";
import CollaboratorsPage from "./pages/CollaboratorsPage";
import ImportPage from "./pages/ImportPage";
import QuotasPage from "./pages/QuotasPage";
import ITRPage from "./pages/ITRPage";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={SummaryPage} />
        <Route path={"/resumo"} component={SummaryPage} />
        <Route path={"/declaracoes/:month"} component={DeclarationsPage} />
        <Route path={"/itr"} component={ITRPage} />
        <Route path={"/comissoes"} component={CommissionsPage} />
        <Route path={"/configuracoes"} component={SettingsPage} />
        <Route path={"/colaboradores"} component={CollaboratorsPage} />
        <Route path={"/cotas"} component={QuotasPage} />
        <Route path={"/importar"} component={ImportPage} />
        <Route path={"/exportar"} component={ImportPage} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      {/* switchable=true habilita o toggle de dark mode */}
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;