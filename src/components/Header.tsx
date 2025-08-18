import React from 'react';
import { Globe, Settings, Bell, LogOut, User } from 'lucide-react';

interface HeaderProps {
  storeId?: string | null;
  user?: { name: string; email: string } | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({ storeId, user, onLogout }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Yuimaru Ship</h1>
              <p className="text-sm text-gray-600">
                店舗管理画面 {storeId && (
                  <span className={`font-medium ${user ? 'text-green-600' : 'text-blue-600'}`}>
                    - {storeId} {user ? '(認証済み)' : '(デモ)'}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200">
              <Bell className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200">
              <Settings className="h-5 w-5" />
            </button>
            <div className="h-8 w-px bg-gray-300"></div>
            
            {/* User Menu */}
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-700">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    title="ログアウト"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">店</span>
                </div>
                <span className="text-sm font-medium text-gray-700">店舗管理者</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});
