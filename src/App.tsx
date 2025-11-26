import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from 'react';
import { ChatProvider } from "./providers/ChatContext";
import { NotificationProvider } from "./providers/NotificationContext";
import { useAuth } from "./providers/SupabaseAuthContext";
import LoadingSpinner from "./components/LoadingSpinner";

// Lazy load components
const Home = lazy(() => import("./features/posts/pages/Home"));
const Profile = lazy(() => import("./features/profile/pages/Profile"));
const SearchResults = lazy(() => import("./features/search/pages/SearchResults"));
const Settings = lazy(() => import("./features/settings/pages/Settings"));
const Notifications = lazy(() => import("./features/notifications/pages/Notifications"));
const Chats = lazy(() => import("./features/chat/pages/Chats"));
const ChatConversation = lazy(() => import("./features/chat/pages/ChatConversation"));
const SupabaseAuth = lazy(() => import("./features/auth/pages/SupabaseAuth"));
const NotFound = lazy(() => import("./pages/error/NotFound"));
const PostDetail = lazy(() => import("./features/posts/pages/PostDetail"));
const Admin = lazy(() => import("./pages/Admin"));

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

const AuthRequiredWrapper = ({ children }: { children: React.ReactNode; }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />; // Redirect to auth page if not logged in
  }
  
  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatProvider>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename="/iPing">
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
                <Routes>
                  <Route path="/auth" element={<SupabaseAuth />} />
                  <Route path="/" element={<AuthRequiredWrapper><Home /></AuthRequiredWrapper>} />
                  <Route path="/:username" element={<AuthRequiredWrapper><Profile /></AuthRequiredWrapper>} />
                  <Route path="/profile" element={<AuthRequiredWrapper><Profile /></AuthRequiredWrapper>} />
                  <Route path="/post/:id" element={<AuthRequiredWrapper><PostDetail /></AuthRequiredWrapper>} />
                  <Route path="/search" element={<AuthRequiredWrapper><SearchResults /></AuthRequiredWrapper>} />
                  <Route path="/notifications" element={<AuthRequiredWrapper><Notifications /></AuthRequiredWrapper>} />
                  <Route path="/chats" element={<AuthRequiredWrapper><Chats /></AuthRequiredWrapper>} />
                  <Route path="/chats/:chatId" element={<AuthRequiredWrapper><ChatConversation /></AuthRequiredWrapper>} />
                  <Route path="/settings" element={<AuthRequiredWrapper><Settings /></AuthRequiredWrapper>} />
                  <Route path="/admin" element={<AuthRequiredWrapper><Admin /></AuthRequiredWrapper>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </NotificationProvider>
      </ChatProvider>
    </QueryClientProvider>
  );
};

export default App;
