import React, { useState } from 'react';
import PasswordStep from './PasswordStep';
import StoreInfoStep from './StoreInfoStep';
import AdminAccountStep from './AdminAccountStep';
import FolderStep from './FolderStep';
import { Shield } from 'lucide-react';
import { dbOperations, STORES, initializeDb } from '@/lib/db';
import { createInitialAdmin, setMasterPassword, createUser } from '@/lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { setSecureFolderPath } from '@/lib/appInitialization';
import { db } from '@/lib/dexieDb';

const SetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  
  
  const [passwordData, setPasswordData] = useState<{
    password: string;
    confirmPassword: string;
  }>({ password: '', confirmPassword: '' });
  
  const [storeData, setStoreData] = useState<{
    storeName: string;
    address: string;
    phone: string;
    email?: string;
    currency: string;
    language: string;
  }>({
    storeName: '',
    address: '',
    phone: '',
    email: '',
            currency: 'XAF',
    language: 'en'
  });
  
  const [adminData, setAdminData] = useState<{
    name: string;
    username: string;
    password: string;
  }>({ name: '', username: 'admin', password: '' });

  const [folderPath, setFolderPath] = useState<string>('C:\\Tech_Plus_POS_Secure_Data');


  const handlePasswordSubmit = (data: { password: string; confirmPassword: string }) => {
    setPasswordData(data);
    setStep(2);
  };

  
  const handleStoreInfoSubmit = (data: {
    storeName: string;
    address: string;
    phone: string;
    email?: string;
    currency: string;
    language: string;
  }) => {
    setStoreData(data);
    setStep(3);
  };

  
  const handleAdminSubmit = async (data: {
    name: string;
    username: string;
    password: string;
  }) => {
    setAdminData(data);
    setStep(4);
  };

  
  const handleFolderSubmit = async (path: string) => {
    setFolderPath(path);
    await completeSetup(path);
  };

  
  const completeSetup = async (secureFolder: string) => {
    setLoading(true);
    
    try {
      
      await initializeDb();
      
      
      await setMasterPassword(passwordData.password);

      
      await setSecureFolderPath(secureFolder);
      
      
      await dbOperations.put(STORES.SETTINGS, {
        id: 'store-info',
        name: storeData.storeName,
        address: storeData.address,
        phone: storeData.phone,
        email: storeData.email || null,
        currency: storeData.currency,
        language: storeData.language,
        createdAt: Date.now()
      });
      
      
      const rootExists = (await db.users.where('username').equals('root').toArray()).length > 0;
      if (!rootExists) {
        await createUser('root', 'ChangeThisRootPassword!', 'Root User', 'root');
      }
      
      
      await dbOperations.put(STORES.SETTINGS, {
        id: 'app-settings',
        setupComplete: true,
        initialized: true,
        lastBackup: null,
        createdAt: Date.now(),
        secureFolderPath: secureFolder
      });
      
      toast.success('Setup completed successfully!');
      
      
      navigate('/login');
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-800 mb-4">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold">Setup Your Tech Plus POS</h1>
          
          {step === 1 && <p className="text-gray-600 mt-2">Create a master password to secure your data</p>}
          {step === 2 && <p className="text-gray-600 mt-2">Enter your store information</p>}
          {step === 3 && <p className="text-gray-600 mt-2">Create an administrator account</p>}
          {step === 4 && <p className="text-gray-600 mt-2">Select a secure folder location</p>}
        </div>
        
        {}
        <div className="flex items-center justify-center mb-8">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            step >= 1 ? 'bg-pos-navy text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            <span className="text-sm">1</span>
          </div>
          <div className={`h-1 w-8 ${step >= 2 ? 'bg-pos-navy' : 'bg-gray-200'}`}></div>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            step >= 2 ? 'bg-pos-navy text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            <span className="text-sm">2</span>
          </div>
          <div className={`h-1 w-8 ${step >= 3 ? 'bg-pos-navy' : 'bg-gray-200'}`}></div>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            step >= 3 ? 'bg-pos-navy text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            <span className="text-sm">3</span>
          </div>
          <div className={`h-1 w-8 ${step >= 4 ? 'bg-pos-navy' : 'bg-gray-200'}`}></div>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            step >= 4 ? 'bg-pos-navy text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            <span className="text-sm">4</span>
          </div>
        </div>
        
        {}
        {step === 1 && <PasswordStep onSubmit={handlePasswordSubmit} />}
        {step === 2 && <StoreInfoStep onSubmit={handleStoreInfoSubmit} initialData={storeData} onBack={() => setStep(1)} />}
        {step === 3 && <AdminAccountStep onSubmit={handleAdminSubmit} initialData={adminData} onBack={() => setStep(2)} />}
        {step === 4 && <FolderStep onSubmit={handleFolderSubmit} initialPath={folderPath} onBack={() => setStep(3)} isLoading={loading} />}
      </div>
    </div>
  );
};

export default SetupWizard;
