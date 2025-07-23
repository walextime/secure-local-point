
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminAccountStepProps {
  onSubmit: (data: {
    name: string;
    username: string;
    password: string;
  }) => void;
  onBack: () => void;
  isLoading?: boolean;
  initialData?: {
    name: string;
    username: string;
    password: string;
  };
}

const AdminAccountStep: React.FC<AdminAccountStepProps> = ({ 
  onSubmit, 
  onBack,
  isLoading = false,
  initialData = {
    name: '',
    username: 'admin',
    password: ''
  }
}) => {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setError(null);
    onSubmit(formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Administrator Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            placeholder="admin"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}
        
        <div className="flex gap-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onBack} 
            className="w-1/2"
            disabled={isLoading}
          >
            Back
          </Button>
          <Button 
            type="submit" 
            className="w-1/2 bg-pos-navy hover:bg-blue-800"
            disabled={isLoading}
          >
            {isLoading ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default AdminAccountStep;
