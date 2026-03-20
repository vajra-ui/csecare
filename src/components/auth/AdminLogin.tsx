import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, Lock, Loader2 } from 'lucide-react';
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
  const adminRole = localStorage.getItem('admin_view_role') || 'Admin';

  const form = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: adminRole === 'HOD' ? 'vajraofficial7@gmail.com' : adminRole === 'COE Cell' ? 'coe@gmail.com' : '',
      password: adminRole === 'HOD' ? 'admin@2026' : adminRole === 'COE Cell' ? 'coe@2026' : '',
    },
  });

  const onSubmit = async (data: AdminLoginForm) => {
    setLoading(true);
    try {
      await adminLogin(data.email, data.password);
      await refreshUser();
      toast({
        title: 'Welcome, Administrator!',
        description: 'You have successfully logged in.',
      });
      setShowTransition(true);
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionComplete = useCallback(() => {
    navigate(adminRole === 'COE Cell' ? '/coe' : '/admin');
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
                <Button
                  type="submit"
                  className="w-full gradient-primary"
                  disabled={loading}
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
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
