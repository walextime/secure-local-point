
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { MasterPasswordService } from '@/services/security/masterPasswordService';

const MasterPasswordSettings: React.FC = () => {
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [lastChanged, setLastChanged] = useState<number | undefined>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPasswordInfo();
  }, []);

  const loadPasswordInfo = async () => {
    try {
      const info = await MasterPasswordService.getInfo();
      setIsPasswordSet(info.isSet);
      setLastChanged(info.lastChanged);
    } catch (error) {
      console.error('Error loading password info:', error);
    }
  };

  const validateForm = (): boolean => {
    if (isPasswordSet && !currentPassword) {
      toast.error('Please enter your current password');
      return false;
    }

    if (!newPassword) {
      toast.error('Please enter a new password');
      return false;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    const validation = MasterPasswordService.validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      toast.error(validation.message || 'Password does not meet requirements');
      return false;
    }

    return true;
  };

  const handleSetPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let success = false;

      if (isPasswordSet) {
        
        success = await MasterPasswordService.changePassword(currentPassword, newPassword);
      } else {
        
        success = await MasterPasswordService.setPassword(newPassword);
      }

      if (success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await loadPasswordInfo();
        toast.success(isPasswordSet ? 'Password changed successfully' : 'Master password set successfully');
      }
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error('Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = (password: string): string => {
    if (!password) return 'text-gray-400';
    const validation = MasterPasswordService.validatePasswordStrength(password);
    return validation.isValid ? 'text-green-600' : 'text-red-600';
  };

  const getPasswordStrengthText = (password: string): string => {
    if (!password) return 'Enter a password';
    const validation = MasterPasswordService.validatePasswordStrength(password);
    return validation.isValid ? 'Strong password' : (validation.message || 'Weak password');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Master Password Settings
        </CardTitle>
        <CardDescription>
          {isPasswordSet 
            ? 'Change your master password used to protect backup files'
            : 'Set a master password to protect backup files'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPasswordSet && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700">
              <Check className="h-4 w-4" />
              <span className="font-medium">Master password is set</span>
            </div>
            {lastChanged && (
              <p className="text-sm text-green-600 mt-1">
                Last changed: {new Date(lastChanged).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {!isPasswordSet && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">No master password set</span>
            </div>
            <p className="text-sm text-yellow-600 mt-1">
              A master password is required to create and access secure backups.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {isPasswordSet && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type={showPasswords ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">
              {isPasswordSet ? 'New Password' : 'Master Password'}
            </Label>
            <Input
              id="newPassword"
              type={showPasswords ? "text" : "password"}
              placeholder={isPasswordSet ? "Enter new password" : "Enter master password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className={`text-xs ${getPasswordStrengthColor(newPassword)}`}>
              {getPasswordStrengthText(newPassword)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type={showPasswords ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showPasswords"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="showPasswords" className="text-sm">
              Show passwords
            </Label>
          </div>
        </div>

        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">Password Requirements:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• At least 8 characters long</li>
            <li>• Contains uppercase and lowercase letters</li>
            <li>• Contains at least one number</li>
          </ul>
        </div>

        <Button 
          onClick={handleSetPassword}
          disabled={loading}
          className="w-full"
        >
          {loading 
            ? 'Processing...' 
            : (isPasswordSet ? 'Change Master Password' : 'Set Master Password')
          }
        </Button>
      </CardContent>
    </Card>
  );
};

export default MasterPasswordSettings;
