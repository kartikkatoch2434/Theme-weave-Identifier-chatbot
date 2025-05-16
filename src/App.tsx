
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { DocumentProvider } from "./context/DocumentContext";
import { ChatProvider } from "./context/ChatContext";

const queryClient = new QueryClient();

const App = () => (
  <Router>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DocumentProvider>
          <ChatProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ChatProvider>
        </DocumentProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </Router>
);

export default App;
