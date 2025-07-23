
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { resetAdminPasswordWithMaster } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Lock } from 'lucide-react';

const AdminPasswordReset: React.FC = () => {
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showMasterPassword, setShowMasterPassword] = useState<boolean>(false);
  
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!adminUsername || !masterPassword || !newPassword) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    
    try {
      setLoading(true);
      
      
      const success = await resetAdminPasswordWithMaster(
        adminUsername,
        masterPassword,
        newPassword
      );
      
      if (success) {
        toast.success('Admin password has been reset');
        
        setAdminUsername('');
        setMasterPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      // Error is already handled by the function itself
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Admin Password Reset
        </CardTitle>
        <CardDescription>
          Reset an admin password using the system master password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminUsername">Admin Username</Label>
            <Input
              id="adminUsername"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              placeholder="Enter admin username"
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="masterPassword">Master Password</Label>
            <div className="flex space-x-2">
              <Input
                id="masterPassword"
                type={showMasterPassword ? "text" : "password"}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Enter system master password"
                className="flex-1"
                disabled={loading}
                required
              />
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setShowMasterPassword(prev => !prev)}
              >
                {showMasterPassword ? 'Hide' : 'Show'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              The master password was created during system setup
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={loading}
              required
            />
          </div>
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            <Lock className="mr-2 h-4 w-4" />
            {loading ? 'Resetting Password...' : 'Reset Admin Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminPasswordReset;
