import React from 'react';
import { Globe, Lock, Shield, Users, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
  isLoading?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading = false }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl inline-block mb-4 shadow-lg">
            <Globe className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Yuimaru Ship</h1>
          <p className="text-gray-600">店舗管理画面</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">ログイン</h2>
            <p className="text-gray-600">
              管理画面にアクセスするにはログインが必要です
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <span>セキュアな認証システム</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="bg-green-100 p-2 rounded-lg">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <span>店舗管理者専用アクセス</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Lock className="h-4 w-4 text-purple-600" />
              </div>
              <span>データ保護とプライバシー</span>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={onLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>ログイン中...</span>
              </>
            ) : (
              <>
                <span>Amazon Cognitoでログイン</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
            </p>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="bg-amber-100 p-1 rounded-full">
              <Globe className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800 mb-1">デモアクセス</p>
              <p className="text-xs text-amber-700">
                ログインなしでデモ機能を試すには、URLに ?store_id=demo を追加してください
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};