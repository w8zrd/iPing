import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let error;
    if (isLogin) {
      ({ error } = await signIn(email, password));
    } else {
      ({ error } = await signUp(email, password, username));
    }

    if (error) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success!',
        description: isLogin ? 'Logged in successfully.' : 'Signed up successfully. Please check your email for confirmation.',
      });
      onClose(); // Close modal on successful auth
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl p-6 glass-strong">
        <DialogHeader>
          <DialogTitle>{isLogin ? 'Sign In' : 'Sign Up'}</DialogTitle>
          <DialogDescription>
            {isLogin ? 'Enter your credentials to access your account.' : 'Create a new account to join iPing!'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {!isLogin && (
            <Input
              id="username"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="col-span-3 rounded-xl border-border/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-apple"
            />
          )}
          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="col-span-3 rounded-xl border-border/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-apple"
          />
          <Input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="col-span-3 rounded-xl border-border/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-apple"
          />
          <Button type="submit" className="w-full rounded-xl" disabled={loading}>
            {loading ? (isLogin ? 'Signing In...' : 'Signing Up...') : (isLogin ? 'Sign In' : 'Sign Up')}
          </Button>
        </form>
        <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="text-center text-primary">
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;