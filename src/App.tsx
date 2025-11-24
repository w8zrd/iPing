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
import AuthModal from "./components/AuthModal";
import { useState } from "react";

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

const AuthRequiredWrapper = ({ children, openAuthModal }: { children: React.ReactNode; openAuthModal: () => void; }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (!user) {
    openAuthModal();
    return <Navigate to="/auth" replace />; // Redirect to auth page if not logged in
  }
  
  return <>{children}</>;
};

const App = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ChatProvider>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<SupabaseAuth />} />
                <Route path="/" element={<AuthRequiredWrapper openAuthModal={openAuthModal}><Home /></AuthRequiredWrapper>} />
                <Route path="/:username" element={<AuthRequiredWrapper openAuthModal={openAuthModal}><Profile /></AuthRequiredWrapper>} />
                <Route path="/profile" element={<AuthRequiredWrapper openAuthModal={openAuthModal}><Profile /></AuthRequiredWrapper>} />
                <Route path="/:username/post/:postId" element={<AuthRequiredWrapper openAuthModal={openAuthModal}><Home /></AuthRequiredWrapper>} />
                <Route path="/search" element={<AuthRequiredWrapper openAuthModal={openAuthModal}><SearchResults /></AuthRequiredWrapper>} />
                <Route path="/notifications" element={<AuthRequiredWrapper openAuthModal={openAuthModal}><Notifications /></AuthRequiredWrapper>} />
                <Route path="/chats" element={<AuthRequiredWrapper openAuthModal={openAuthModal}><Chats /></AuthRequiredWrapper>} />
                <Route path="/chats/:chatId" element={<AuthRequiredWrapper openAuthModal={openAuthModal}><ChatConversation /></AuthRequiredWrapper>} />
                <Route path="/settings" element={<AuthRequiredWrapper openAuthModal={openAuthModal}><Settings /></AuthRequiredWrapper>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
          </TooltipProvider>
        </NotificationProvider>
      </ChatProvider>
    </QueryClientProvider>
  );
};

export default App;
