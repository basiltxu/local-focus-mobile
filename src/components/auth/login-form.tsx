
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { QuoteRequestForm } from "./quote-request-form";
import { Logo } from "../logo";

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("basil.khoury14@gmail.com");
  const [password, setPassword] = useState("password");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for password reset dialog
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
        router.push("/dashboard");

    } catch(err: any) {
        let errorMessage = "An unexpected error occurred. Please try again.";
        switch (err.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                errorMessage = "Invalid email or password. Please try again.";
                break;
            case 'auth/invalid-email':
                errorMessage = "The email address is not valid.";
                break;
            case 'auth/email-already-in-use':
                errorMessage = "This email is already in use. Please try logging in or resetting your password.";
                break;
            default:
                errorMessage = `Authentication failed: ${err.message}`;
        }
        setError(errorMessage);
        console.error("Login failed:", err);
        toast({
          title: 'Login Failed',
          description: errorMessage,
          variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "Password Reset Email Sent",
        description: `A reset link has been sent to ${resetEmail}. Please check your inbox.`,
      });
      setIsResetDialogOpen(false);
      setResetEmail("");
    } catch (error: any) {
      console.error("Error sending password reset:", error);
      toast({
        title: "Error Sending Reset Email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const openResetDialog = () => {
    setResetEmail(email);
    setIsResetDialogOpen(true);
  }

  return (
    <>
    <Card className="w-full" data-testid="login-card">
        <CardHeader className="items-center">
            <Logo className="h-12 w-auto mb-4" />
          <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              data-testid="email-input"
            />
          </div>
          <div className="space-y-2">
             <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button 
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={openResetDialog}
                    data-testid="forgot-password-button">
                    Forgot Password?
                </Button>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              data-testid="password-input"
            />
          </div>
           {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleLogin} className="w-full" disabled={isLoading} data-testid="login-button">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
           <QuoteRequestForm>
              <Button type="button" className="w-full" variant="secondary" disabled={isLoading} data-testid="quote-request-button">
                Request Services / Get a Quote
              </Button>
            </QuoteRequestForm>
        </CardFooter>
    </Card>

    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address below to receive a password reset link.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="reset-email">Email Address</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="user@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              data-testid="reset-email-input"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={handlePasswordReset} disabled={isSendingReset} data-testid="send-reset-link-button">
                {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
