
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from 'lucide-react';

interface MasterPasswordInputProps {
  password: string;
  onPasswordChange: (password: string) => void;
}

export const MasterPasswordInput: React.FC<MasterPasswordInputProps> = ({
  password,
  onPasswordChange
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="masterPassword" className="flex items-center gap-2">
        <Lock className="h-4 w-4" />
        Master Password (Required)
      </Label>
      <Input
        id="masterPassword"
        type="password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        placeholder="Enter master password to generate report"
        className="max-w-md"
      />
      <p className="text-sm text-gray-600">
        Your master password is required to encrypt and save the report
      </p>
    </div>
  );
};
