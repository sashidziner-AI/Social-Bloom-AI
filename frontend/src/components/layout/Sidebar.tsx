import { motion } from 'framer-motion';
import {
  BarChart3,
  Building2,
  CheckSquare,
  FileText,
  Home,
  Image,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Settings,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <Home size={20} /> },
  { label: 'Posters', path: '/posters', icon: <FileText size={20} /> },
  { label: 'Creatives', path: '/creatives', icon: <Image size={20} /> },
  { label: 'Approvals', path: '/approvals', icon: <CheckSquare size={20} /> },
  { label: 'Publishing', path: '/publish', icon: <Send size={20} /> },
  { label: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
  {
    label: 'Companies',
    path: '/companies',
    icon: <Building2 size={20} />,
  },
  {
    label: 'Admin',
    path: '/admin',
    icon: <Shield size={20} />,
    roles: ['admin'],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      className="h-screen bg-white border-r border-gray-200 flex flex-col sticky top-0"
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-100">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent"
          >
            Social Bloom
          </motion.span>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </motion.button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems
          .filter(
            (item) =>
              !item.roles || (user && item.roles.includes(user.role))
          )
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                  isActive
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              {item.icon}
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
              isActive
                ? 'bg-purple-50 text-purple-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )
          }
        >
          <Settings size={20} />
          {!collapsed && <span className="text-sm">Settings</span>}
        </NavLink>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </motion.button>
      </div>
    </motion.aside>
  );
}
