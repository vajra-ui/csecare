import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaavaiLogo } from '@/components/ui/PaavaiLogo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasRecoveryToken, setHasRecoveryToken] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setHasRecoveryToken(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecoveryToken(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasRecoveryToken && !success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Invalid or expired reset link.</p>
            <Button onClick={() => navigate('/forgot-password')}>Request New Link</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">
        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <PaavaiLogo size="lg" />
            </div>
            <div>
              <CardTitle className="font-display text-2xl">Set New Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">Password Updated</h3>
                <p className="text-sm text-muted-foreground">
                  Your password has been successfully changed.
                </p>
                <Button onClick={() => navigate('/')}>Go to Login</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
