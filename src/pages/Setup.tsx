import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupWizard from '../components/setup/SetupWizard';
import { isDbInitialized, dbOperations, STORES } from '../lib/db';

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const initialized = await isDbInitialized();
        if (initialized) {
          navigate('/login');
          return;
        }
        
        const users = await dbOperations.getAll(STORES.USERS);
        if (users && users.length > 0) {
          navigate('/login');
          return;
        }
        setLoading(false);
      } catch (error) {
        console.error('Setup check error:', error);
        setLoading(false);
      }
    };
    
    checkSetup();
  }, [navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return <SetupWizard />;
};

export default Setup;
