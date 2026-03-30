import { Outlet, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Plus } from 'lucide-react';

export function AppLayout() {
  const { user } = useAuth();
  const canCreate = user?.role !== 'designer';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div>
            {canCreate && (
              <Link
                to="/posters/new"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors shadow-sm"
              >
                <Plus size={16} />
                New Request
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <UserIcon size={18} className="text-purple-600" />
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
