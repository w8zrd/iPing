import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ChatProvider } from "./contexts/ChatContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { useAuth } from "./contexts/SupabaseAuthContext";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import SearchResults from "./pages/SearchResults";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Chats from "./pages/Chats";
import ChatConversation from "./pages/ChatConversation";
import SupabaseAuth from "./pages/SupabaseAuth";
import NotFound from "./pages/NotFound";
import LoadingSpinner from "./components/LoadingSpinner";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
      <ChatProvider>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              basename={import.meta.env.PROD && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : undefined}
            >
              <Routes>
                <Route path="/auth" element={<SupabaseAuth />} />
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/profile/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
                <Route path="/chats/:chatId" element={<ProtectedRoute><ChatConversation /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </NotificationProvider>
      </ChatProvider>
    </QueryClientProvider>
);

export default App;
