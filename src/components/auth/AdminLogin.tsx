import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, Lock, Loader2, ShieldAlert } from 'lucide-react';
import { LoginTransition } from './LoginTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaavaiLogo } from '@/components/ui/PaavaiLogo';
import { adminLogin } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/rateLimiter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

export function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const adminRole = localStorage.getItem('admin_view_role') || 'Admin';

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      setRateLimited(false);
      return;
    }
    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          setRateLimited(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const form = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: AdminLoginForm) => {
    // Check rate limit
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      setRateLimited(true);
      setLockoutSeconds(rateCheck.remainingSeconds || 300);
      toast({
        title: 'Too many attempts',
        description: `Account locked. Try again in ${Math.ceil((rateCheck.remainingSeconds || 300) / 60)} minutes.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await adminLogin(data.email, data.password);
      resetAttempts();
      await refreshUser();
      toast({
        title: 'Welcome, Administrator!',
        description: 'You have successfully logged in.',
      });
      setShowTransition(true);
    } catch (error) {
      const result = recordFailedAttempt();
      if (result.locked) {
        setRateLimited(true);
        setLockoutSeconds(result.remainingSeconds || 300);
        toast({
          title: 'Account Locked',
          description: `Too many failed attempts. Try again in 5 minutes.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login Failed',
          description: error instanceof Error ? error.message : 'Invalid credentials',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionComplete = useCallback(() => {
    navigate('/admin');
  }, [navigate, adminRole]);

  return (
    <>
    {showTransition && <LoginTransition roleName={adminRole} onComplete={handleTransitionComplete} />}
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">
        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-4"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex justify-center">
              <PaavaiLogo size="lg" />
            </div>
            <div>
              <CardTitle className="font-display text-2xl">{adminRole} Login</CardTitle>
              <CardDescription>
                Access the {adminRole.toLowerCase()} portal
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="admin@paavai.edu.in"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {rateLimited && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                    <span>Too many attempts. Try again in {Math.ceil(lockoutSeconds / 60)} min {lockoutSeconds % 60}s</span>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full gradient-primary"
                  disabled={loading || rateLimited}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
