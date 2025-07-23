import { toast } from 'sonner';
import { dbOperations, STORES } from './dexieDb';
import { hashPassword, verifyPassword, generateId } from './crypto';
import { db } from '@/lib/dexieDb';


export type UserRole = 'root' | 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: number;
  lastLogin?: number;
}


let currentUser: User | null = null;


export const createUser = async (
  username: string,
  password: string,
  name: string,
  role: UserRole = 'cashier'
): Promise<User> => {
  try {
    // Normalize username to lowercase
    const normalizedUsername = username.trim().toLowerCase();
    const passwordHash = await hashPassword(password);
    // Use direct Dexie query for existing user
    const existingUsers = await db.users.where('username').equals(normalizedUsername).toArray();
    if (existingUsers.length > 0) {
      throw new Error('User already exists');
    }
    const newUser: User = {
      id: generateId(),
      username: normalizedUsername,
      passwordHash,
      name,
      role,
      active: true,
      createdAt: Date.now(),
    };
    // Use direct Dexie add for immediate effect
    await db.users.add(newUser);
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    toast.error('Failed to create user: ' + (error as Error).message);
    throw error;
  }
};


export const loginUser = async (
  username: string,
  password: string
): Promise<User> => {
  try {
    // Normalize username to lowercase
    const normalizedUsername = username.trim().toLowerCase();
    // Use direct Dexie query for login
    const users = await db.users.where('username').equals(normalizedUsername).toArray();
    const user = users[0];
    if (!user) {
      throw new Error('Invalid username or password');
    }
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }
    if (!user.active) {
      throw new Error('User account is inactive');
    }
    const updatedUser = {
      ...user,
      lastLogin: Date.now()
    };
    await db.users.put(updatedUser);
    currentUser = updatedUser;
    sessionStorage.setItem('currentUser', JSON.stringify({
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      active: updatedUser.active
    }));
    await dbOperations.put(STORES.AUTH, {
      id: 'currentUser',
      ...updatedUser
    });
    return updatedUser;
  } catch (error) {
    console.error('Login error:', error);
    toast.error('Login failed: ' + (error as Error).message);
    throw error;
  }
};


export const logoutUser = async (): Promise<void> => {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  
  
  try {
    await dbOperations.delete(STORES.AUTH, 'currentUser');
  } catch (error) {
    console.error('Error removing current user from AUTH store:', error);
  }
};


export const getCurrentUser = async (): Promise<User | null> => {
  try {
    console.log('🔍 Getting current user...');
    
    if (currentUser) {
      console.log('✅ Found current user in memory:', currentUser.username);
      return currentUser;
    }
    
    console.log('🔍 Checking session storage...');
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('📦 Found user in session storage:', parsedUser.username);
        
        const user = await dbOperations.get<User>(STORES.USERS, parsedUser.id);
        if (user && user.active) {
          console.log('✅ User found in database and is active');
          currentUser = user;
          return user;
        } else {
          console.log('❌ User not found in database or not active');
        }
      } catch (error) {
        console.error('❌ Error parsing stored user:', error);
      }
    } else {
      console.log('📦 No user in session storage');
    }
    
    console.log('🔍 Checking AUTH store...');
    const authUser = await dbOperations.get<User>(STORES.AUTH, 'currentUser');
    if (authUser && authUser.active) {
      console.log('✅ Found user in AUTH store:', authUser.username);
      currentUser = authUser;
      return authUser;
    } else {
      console.log('❌ No active user in AUTH store');
    }
    
    console.log('❌ No current user found');
    return null;
  } catch (error) {
    console.error('❌ Error getting current user:', error);
    return null;
  }
};


export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user !== null;
};


export const hasRole = async (allowedRoles: string[]): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    return allowedRoles.includes(user.role);
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};


export const createInitialAdmin = async (
  username: string,
  password: string,
  name: string,
  role: UserRole = 'admin'
): Promise<User> => {
  return createUser(username, password, name, role);
};


export const updateUser = async (
  userId: string,
  updates: Partial<Omit<User, 'id' | 'passwordHash'>>
): Promise<User> => {
  try {
    const user = await dbOperations.get<User>(STORES.USERS, userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role === 'root') {
      if (updates.username && updates.username !== 'RootAccount') {
        throw new Error('Cannot rename RootAccount');
      }
      if (updates.role && updates.role !== 'root') {
        throw new Error('Cannot change RootAccount role');
      }
    }
    const updatedUser = {
      ...user,
      ...updates
    };
    await dbOperations.put(STORES.USERS, updatedUser);
    if (currentUser?.id === userId) {
      currentUser = updatedUser;
      sessionStorage.setItem('currentUser', JSON.stringify({
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role,
        active: updatedUser.active
      }));
    }
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    toast.error('Failed to update user');
    throw error;
  }
};


export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> => {
  try {
    const user = await dbOperations.get<User>(STORES.USERS, userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
    
    
    const passwordHash = await hashPassword(newPassword);
    
    
    const updatedUser = {
      ...user,
      passwordHash
    };
    
    await dbOperations.put(STORES.USERS, updatedUser);
    
    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    toast.error('Failed to change password: ' + (error as Error).message);
    throw error;
  }
};


export const resetAdminPasswordWithMaster = async (
  adminUsername: string,
  masterPassword: string,
  newPassword: string
): Promise<boolean> => {
  try {
    
    const isMasterValid = await verifyMasterPassword(masterPassword);
    
    if (!isMasterValid) {
      throw new Error('Invalid master password');
    }
    
    
    const users = await db.users.where('username').equals(adminUsername).toArray();
    
    if (users.length === 0) {
      throw new Error('Admin user not found');
    }
    
    const adminUser = users[0];
    
    
    if (adminUser.role !== 'admin') {
      throw new Error('User is not an administrator');
    }
    
    
    const passwordHash = await hashPassword(newPassword);
    
    
    const updatedUser = {
      ...adminUser,
      passwordHash
    };
    
    await dbOperations.put(STORES.USERS, updatedUser);
    
    return true;
  } catch (error) {
    console.error('Error resetting admin password:', error);
    toast.error('Failed to reset admin password: ' + (error as Error).message);
    throw error;
  }
};


export const isMasterPasswordSet = async (): Promise<boolean> => {
  try {
    const masterPassword = await dbOperations.get<{ id: string; masterPasswordHash: string }>(
      STORES.AUTH,
      'master'
    );
    return !!masterPassword;
  } catch (error) {
    return false;
  }
};


export const setMasterPassword = async (password: string): Promise<void> => {
  try {
    const passwordHash = await hashPassword(password);
    
    await dbOperations.put(STORES.AUTH, {
      id: 'master',
      masterPasswordHash: passwordHash,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error('Error setting master password:', error);
    toast.error('Failed to set master password');
    throw error;
  }
};


export const verifyMasterPassword = async (password: string): Promise<boolean> => {
  try {
    const auth = await dbOperations.get<{ id: string; masterPasswordHash: string }>(
      STORES.AUTH,
      'master'
    );
    
    if (!auth?.masterPasswordHash) {
      return false;
    }
    
    return verifyPassword(password, auth.masterPasswordHash);
  } catch (error) {
    console.error('Error verifying master password:', error);
    return false;
  }
};


export const authenticateUser = async (
  username: string,
  password: string
): Promise<boolean> => {
  try {
    
    const users = await db.users.where('username').equals(username).toArray();
    
    if (users.length === 0) {
      return false;
    }
    
    const user = users[0];
    
    
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid || !user.active) {
      return false;
    }
    
    
    const updatedUser = {
      ...user,
      lastLogin: Date.now()
    };
    
    await dbOperations.put(STORES.USERS, updatedUser);
    
    
    currentUser = updatedUser;
    
    
    sessionStorage.setItem('currentUser', JSON.stringify({
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      active: updatedUser.active
    }));
    
    
    await dbOperations.put(STORES.AUTH, {
      id: 'currentUser',
      ...updatedUser
    });
    
    return true;
  } catch (error) {
    console.error('Authentication error:', error);
    return false;
  }
};

export const isRoot = (user: User) => user.role === 'root';
export const isAdminOrManager = (user: User) => ['admin', 'manager'].includes(user.role);

export const preventRootDeleteOrRename = (user: User) => {
  if (user.role === 'root' || user.username === 'RootAccount') {
    throw new Error('Cannot delete or rename RootAccount');
  }
};

export const ensureRootAccountExists = async () => {
  // Always check for root account (username: 'rootaccount')
  const rootUser = await db.users.where('username').equals('rootaccount').first();
  if (!rootUser) {
    const passwordHash = await hashPassword('AccountRoot');
    const newRoot = {
      id: generateId(),
      username: 'rootaccount',
      passwordHash,
      name: 'Root User',
      role: 'root',
      active: true,
      createdAt: Date.now(),
    };
    await db.users.add(newRoot);
  }
};
