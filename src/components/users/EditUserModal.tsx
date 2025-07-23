import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { hashPassword } from '@/lib/crypto';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
  createdAt: number;
  passwordHash?: string;
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserUpdated?: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ 
  open, 
  onOpenChange, 
  user, 
  onUserUpdated 
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    username?: string;
    password?: string;
  }>({});

  
  useEffect(() => {
    if (user) {
      setName(user.name);
      setUsername(user.username);
      setPassword(''); // Don't show the password
      setRole(user.role);
      setActive(user.active);
      setChangePassword(false);
    }
  }, [user]);

  const validateForm = async (): Promise<boolean> => {
    const errors: {
      name?: string;
      username?: string;
      password?: string;
    } = {};

    
    if (!name.trim()) {
      errors.name = 'Name is required';
    }

    
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (username !== user?.username) {
      try {
        // Get all users and check for username case-insensitively, except for the current user
        const allUsers = await dbOperations.getAll<User>(STORES.USERS);
        const existingUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== user?.id);
        if (existingUser) {
          errors.username = 'Username already exists';
        }
      } catch (error) {
        console.error('Error checking username:', error);
      }
    }

    
    if (changePassword) {
      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const isValid = await validateForm();
      
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }
      
      
      const fullUser = await dbOperations.get<User>(STORES.USERS, user.id);
      
      if (!fullUser) {
        toast.error('User not found');
        setIsSubmitting(false);
        return;
      }
      
      
      const updatedUser: User = {
        ...fullUser,
        name,
        username,
        role,
        active,
      };
      
      
      if (changePassword) {
        updatedUser.passwordHash = await hashPassword(password);
      }
      
      
      await dbOperations.put(STORES.USERS, updatedUser);
      
      toast.success('User updated successfully');
      
      
      setPassword('');
      setChangePassword(false);
      setFormErrors({});
      
      // Close modal
      onOpenChange(false);
      
      // Call onUserUpdated callback
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
              {formErrors.name && (
                <p className="text-sm text-red-500">{formErrors.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                disabled={user?.role === 'root' || user?.username === 'RootAccount'}
              />
              {formErrors.username && (
                <p className="text-sm text-red-500">{formErrors.username}</p>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="change-password" className="cursor-pointer">Change Password</Label>
                <Switch 
                  id="change-password" 
                  checked={changePassword} 
                  onCheckedChange={setChangePassword}
                />
              </div>
              {changePassword && (
                <>
                  <Label htmlFor="edit-password">New Password</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {formErrors.password && (
                    <p className="text-sm text-red-500">{formErrors.password}</p>
                  )}
                </>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={role}
                onValueChange={setRole}
                disabled={user?.role === 'root' || user?.username === 'RootAccount'}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="active" className="cursor-pointer">Active Account</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;
