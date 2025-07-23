import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { isDbInitialized } from '@/lib/db';
import { loginUser, isAuthenticated } from '@/lib/auth';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { refreshAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Check if setup is needed or user is already logged in
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if database is initialized
        const initialized = await isDbInitialized();
        
        if (!initialized) {
          // If not initialized, redirect to setup
          navigate('/setup');
          return;
        }
        
        
        const authenticated = await isAuthenticated();
        
        if (authenticated) {
          
          navigate('/pos');
          return;
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Initialization error:', error);
        setLoading(false);
      }
    };
    
    initialize();
  }, [navigate]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (!username || !password) {
      setLoginError(t.auth.wrongCredentials);
      return;
    }
    
    setLoggingIn(true);
    
    try {
      const user = await loginUser(username, password);
      toast.success(t.auth.loginSuccess);
      
      
      await refreshAuth();
      navigate('/pos');
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(t.auth.wrongCredentials);
    } finally {
      setLoggingIn(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">{t.common.loading}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-800 mb-4">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold">{t.auth.loginTitle}</h1>
          <p className="text-gray-600 mt-2">{t.auth.loginSubtitle}</p>
        </div>
        
        {loginError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{loginError}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t.auth.username}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t.auth.username}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.auth.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-pos-navy hover:bg-blue-800"
              disabled={loggingIn}
            >
              {loggingIn ? t.common.loading : t.auth.loginButton}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
