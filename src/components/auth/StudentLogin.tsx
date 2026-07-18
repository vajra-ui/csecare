import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Hash, Calendar, Loader2 } from 'lucide-react';
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
import { studentLogin } from '@/lib/auth';
import { tryOfflineLogin, isNetworkError } from '@/lib/offlineAuth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const studentLoginSchema = z.object({
  identifier: z.string().min(1, 'Roll Number or Register Number is required'),
  dob: z.string().min(1, 'Date of Birth is required'),
});

type StudentLoginForm = z.infer<typeof studentLoginSchema>;

export function StudentLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  const form = useForm<StudentLoginForm>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: {
      identifier: '',
      dob: '',
    },
  });

  const onSubmit = async (data: StudentLoginForm) => {
    setLoading(true);
    const offlineFirst = typeof navigator !== 'undefined' && navigator.onLine === false;
    try {
      if (offlineFirst) {
        const cached = await tryOfflineLogin('STUDENT', data.identifier, data.dob);
        if (!cached) throw new Error("You're offline and we don't have cached credentials for this account. Connect once online to enable offline login.");
        await refreshUser();
        toast({ title: `Welcome back, ${cached.name}!`, description: 'Signed in offline from cached credentials.' });
        setShowTransition(true);
        return;
      }
      const user = await studentLogin(data.identifier, data.dob);
      await refreshUser();
      toast({ title: `Welcome, ${user.name}!`, description: 'You have successfully logged in.' });
      setShowTransition(true);
    } catch (error) {
      if (isNetworkError(error)) {
        const cached = await tryOfflineLogin('STUDENT', data.identifier, data.dob);
        if (cached) {
          await refreshUser();
          toast({ title: `Welcome back, ${cached.name}!`, description: 'Network unavailable — signed in offline.' });
          setShowTransition(true);
          setLoading(false);
          return;
        }
      }
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionComplete = useCallback(() => navigate('/student'), [navigate]);

  return (
    <>
    {showTransition && <LoginTransition roleName="Student" onComplete={handleTransitionComplete} />}
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
              <CardTitle className="font-display text-2xl">Student Login</CardTitle>
              <CardDescription>
                Enter your Roll Number or Register Number and Date of Birth
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roll Number / Register Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="21CSE001 or 611221104001"
                            className="pl-10 uppercase"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
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
                  className="w-full bg-info hover:bg-info/90 text-info-foreground"
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
