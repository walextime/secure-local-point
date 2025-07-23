import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Package, Users, BarChart2, User, Settings, Menu, HardDrive, Printer } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCurrentUser } from '@/lib/auth';
import { useTranslation } from '@/hooks/useTranslation';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [userRole, setUserRole] = useState<string>('cashier');
  
  
  useEffect(() => {
    const checkRole = async () => {
      const user = await getCurrentUser();
      setUserRole(user?.role || 'cashier');
    };
    
    checkRole();
  }, []);
  
  
  const menuItems = [
    { path: '/pos', label: t.nav.pointOfSale, icon: <ShoppingCart size={20} />, roles: ['admin', 'manager', 'cashier'] },
    { path: '/pending-sales', label: t.nav.pendingSales, icon: <BarChart2 size={20} />, roles: ['admin', 'manager', 'cashier'] },
    { path: '/printed-receipts', label: 'Printed Receipts', icon: <Printer size={20} />, roles: ['admin', 'manager', 'cashier'] },
    { path: '/inventory', label: t.nav.inventory, icon: <Package size={20} />, roles: ['admin', 'manager'] },
    { path: '/customers', label: t.nav.customers, icon: <Users size={20} />, roles: ['admin', 'manager'] },
    { path: '/sales-history', label: t.nav.salesHistory, icon: <BarChart2 size={20} />, roles: ['admin', 'manager'] },
    { path: '/users', label: t.nav.users, icon: <User size={20} />, roles: ['admin'] },
    { path: '/backup', label: t.nav.backup, icon: <HardDrive size={20} />, roles: ['admin'] },
    { path: '/settings', label: t.nav.settings, icon: <Settings size={20} />, roles: ['admin'] },
  ];
  
  
  let filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));
  if (userRole === 'cashier') {
    filteredMenuItems = menuItems.filter(item => ['pos', 'pending-sales', 'printed-receipts'].some(key => item.path.includes(key)));
  }
  if (userRole === 'root') {
    filteredMenuItems = menuItems.filter(item => !['/pos', '/pending-sales', '/printed-receipts', '/sales-history'].includes(item.path));
  }
  
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <>
      {}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}
      
      {}
      <aside 
        className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                   fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-300 ease-in-out 
                   bg-pos-navy text-white md:translate-x-0 md:static md:z-auto`}
      >
        {}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Tech Plus POS</h1>
          {isMobile && (
            <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-gray-700">
              <Menu size={20} />
            </button>
          )}
        </div>
        
        {}
        <nav className="p-2">
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={isMobile ? toggleSidebar : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-xs text-gray-400 capitalize">
            {t.auth.login}: {t.users[userRole as keyof typeof t.users] || userRole}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
