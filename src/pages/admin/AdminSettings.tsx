import { Settings } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AdminSettings() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            System configuration and preferences
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>System Info</CardTitle>
              <CardDescription>Current system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Department</span>
                <span className="text-sm font-medium">CSE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sections</span>
                <span className="text-sm font-medium">CSE A, B, C, D</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Years</span>
                <span className="text-sm font-medium">I, II, III, IV</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <span className="text-sm text-success font-medium">Connected</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Login method configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Admin Login</span>
                <span className="text-sm font-medium">Email + Password</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Faculty Login</span>
                <span className="text-sm font-medium">Faculty ID + DOB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Student Login</span>
                <span className="text-sm font-medium">Roll Number + DOB</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
