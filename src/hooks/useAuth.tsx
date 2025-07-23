import { useState, useEffect, createContext, useContext } from 'react';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { User } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const refreshAuth = async () => {
    try {
      console.log('🔄 Refreshing authentication...');
      setIsLoading(true);
      
      
      const authenticated = await isAuthenticated();
      console.log('🔐 Authentication check result:', authenticated);
      
      if (authenticated) {
        console.log('✅ User is authenticated, getting current user...');
        
        const currentUser = await getCurrentUser();
        console.log('👤 Current user:', currentUser);
        setUser(currentUser);
        setAuthenticated(true);
      } else {
        console.log('❌ User is not authenticated');
        setUser(null);
        setAuthenticated(false);
      }
      
    } catch (error) {
      console.error('❌ Authentication refresh error:', error);
      setUser(null);
      setAuthenticated(false);
    } finally {
      console.log('🏁 Authentication refresh complete');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: authenticated,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
