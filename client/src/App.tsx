import { Route, Switch } from 'wouter';
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
// import AIAgent from "./pages/AIAgent"; // Removed - router not implemented
import StreamingChat from "./pages/StreamingChat";
import APIDocs from "./pages/APIDocs";
import AdminDashboard from "./pages/AdminDashboard";
import ExportSettings from "./pages/ExportSettings";
import AdvancedFeatures from "./pages/AdvancedFeatures";
import { DocumentGenerator } from './pages/DocumentGenerator';
import { AdvancedFeaturesPage } from './pages/AdvancedFeaturesPage';
import HistoryMemory from './pages/HistoryMemory';
import FaceSwap from './pages/FaceSwap';
import FaceSwapPage from './pages/FaceSwapPage';
import FaceSwapHQPage from './pages/FaceSwapHQ';
import FaceFusionV3Page from './pages/FaceFusionV3';
import FaceFusionHybridPage from './pages/FaceFusionHybrid';
import UnifiedChat from './pages/UnifiedChat';
import CodeGeneratorPage from './pages/CodeGeneratorPage';
import PoiPoiDashboard from './pages/PoiPoiDashboard';
import PoiPoiBetaChat from './pages/PoiPoiBetaChat';
import AIProviderSelector from './pages/AIProviderSelector';
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={Home} />
      {/* <Route path="/agent" component={AIAgent} /> */}
      <Route path="/streaming" component={StreamingChat} />
      <Route path="/api-docs" component={APIDocs} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/export" component={ExportSettings} />
      <Route path="/advanced-features" component={AdvancedFeatures} />
      <Route path="/documents" component={DocumentGenerator} />
      <Route path="/advanced-features" component={AdvancedFeaturesPage} />
      <Route path="/history-memory" component={HistoryMemory} />
      <Route path="/face-swap" component={FaceSwap} />
      <Route path="/face-swap-new" component={FaceSwapPage} />
      <Route path="/face-swap-hq" component={FaceSwapHQPage} />
      <Route path="/facefusion-v3" component={FaceFusionV3Page} />
      <Route path="/facefusion-hybrid" component={FaceFusionHybridPage} />
      <Route path="/unified-chat" component={UnifiedChat} />
      <Route path="/code-generator" component={CodeGeneratorPage} />
      <Route path="/dashboard" component={PoiPoiDashboard} />
      <Route path="/beta-chat" component={PoiPoiBetaChat} />
      <Route path="/ai-providers" component={AIProviderSelector} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
