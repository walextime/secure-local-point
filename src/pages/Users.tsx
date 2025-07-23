import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';
import AddUserModal from '@/components/users/AddUserModal';
import EditUserModal from '@/components/users/EditUserModal';
import { hasRole, loginUser } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';

interface UserData {
  id: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
  createdAt: number;
}

const Users: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Check if user has admin access
  useEffect(() => {
    const checkAccess = async () => {
      const isAllowed = await hasRole(['admin', 'root']);
      if (!isAllowed) {
        toast.error(t.roles.adminRequired);
        navigate('/pos');
      } else {
        loadUsers();
      }
    };
    
    checkAccess();
  }, [navigate, t]);

  
  const loadUsers = async () => {
    try {
      setLoading(true);
      const loadedUsers = await dbOperations.getAll<UserData>(STORES.USERS);
      setUsers(loadedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    
    const adminUsers = users.filter(user => user.role === 'admin');
    const userToDelete = users.find(user => user.id === userId);
    
    if (userToDelete?.role === 'admin' && adminUsers.length <= 1) {
      toast.error(t.users.cannotDeleteAdmin);
      return;
    }
    
    if (confirm(t.users.confirmDelete)) {
      try {
        await dbOperations.delete(STORES.USERS, userId);
        toast.success('User deleted successfully');
        loadUsers(); 
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleUserChangeRequest = () => {
    setShowAuthModal(true);
  };

  const handleAuthConfirm = async () => {
    try {
      await loginUser(authUsername, authPassword);
      setShowAuthModal(false);
      setAuthUsername('');
      setAuthPassword('');
      setAuthError('');
      // Proceed with user change logic here
      window.location.reload(); // Force page reload to enforce new session and show login modal
    } catch (error) {
      setAuthError('Invalid username or password');
    }
  };

  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter out the root account from all user lists
  const filteredUsers = users.filter(u => u.username.toLowerCase() !== 'rootaccount');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t.users.userManagement}</h1>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          {t.users.addUser}
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gray-100 rounded-full">
              <User size={32} className="text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">No Users Found</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first user</p>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus size={16} className="mr-2" />
            {t.users.addUser}
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.users.name}</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>{t.users.role}</TableHead>
                <TableHead>{t.users.created}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{t.users.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name}
                  </TableCell>
                  <TableCell>
                    {user.username}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {t.users[user.role as keyof typeof t.users] || user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.active ? t.users.active : t.users.inactive}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title={t.users.editUser}
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title={t.users.deleteUser}
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <AddUserModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onUserAdded={loadUsers}
      />

      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUser}
        onUserUpdated={loadUsers}
      />

      {showAuthModal && (
        <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">Authenticate to Change User</h2>
            <Input
              placeholder="Username"
              value={authUsername}
              onChange={e => setAuthUsername(e.target.value)}
              className="mb-2"
            />
            <Input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              className="mb-2"
            />
            {authError && <div className="text-red-500 mb-2">{authError}</div>}
            <Button onClick={handleAuthConfirm}>Confirm</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default Users;
