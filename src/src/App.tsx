import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OrderCard } from './components/OrderCard';
import { StatsCard } from './components/StatsCard';
import { useStoreId } from './hooks/useStoreId';
import { useAuth } from './hooks/useAuth';
import { fetchOrdersFromGAS, updateOrderDataInGAS, OrderData } from './services/gasApi';
import { Package, Clock, CheckCircle, TruckIcon, AlertCircle, Loader2, ExternalLink, User, Lock } from 'lucide-react';

function App() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storeId = useStoreId();
  const { isAuthenticated, user, isLoading: authLoading, login, logout } = useAuth();

  // Fetch orders when storeId is available
  useEffect(() => {
    if (storeId && isAuthenticated) {
      loadOrders();
    }
  }, [storeId, isAuthenticated]);

  const loadOrders = async () => {
    if (!storeId) return;

    setLoading(true);
    setError(null);
    
    try {
      const ordersData = await fetchOrdersFromGAS(storeId);
      setOrders(ordersData);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('注文データの読み込みに失敗しました。API接続を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderDataUpdate = async (
    orderId: string, 
    finalWeight?: number, 
    totalPrice?: number, 
    boxSize?: { length: number; width: number; height: number }
  ) => {
    if (!storeId) {
      alert('店舗IDが取得できません。URLに ?store_id=YOUR_STORE_ID を追加してください。');
      return;
    }

    try {
      // Update in Firebase - 重量、金額、箱サイズを同時に送信
      await updateOrderDataInGAS(storeId, orderId, finalWeight, totalPrice, boxSize);
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.order_id === orderId 
            ? { 
                ...order, 
                final_weight: finalWeight !== undefined ? finalWeight.toString() : order.final_weight,
                total_price: totalPrice !== undefined ? totalPrice.toString() : order.total_price,
                totalWeight: finalWeight !== undefined ? finalWeight : order.totalWeight,
                parcels: boxSize ? [{
                  ...order.parcels?.[0],
                  length: boxSize.length.toString(),
                  width: boxSize.width.toString(),
                  height: boxSize.height.toString()
                }] : order.parcels
              }
            : order
        )
      );
      
      // 成功メッセージ
      let message = `注文 ${orderId} のデータが正常に更新されました。`;
      if (finalWeight !== undefined) {
        message += `\n総重量: ${finalWeight}kg`;
      }
      if (totalPrice !== undefined) {
        message += `\n合計金額: ¥${totalPrice.toLocaleString()}`;
      }
      if (boxSize) {
        message += `\n箱サイズ: ${boxSize.length}×${boxSize.width}×${boxSize.height}cm`;
      }
      
      alert(message);
    } catch (error) {
      console.error('Order data update failed:', error);
      alert('データの更新に失敗しました。もう一度お試しください。');
      throw error; // OrderCardでエラーハンドリングするために再スロー
    }
  };

  // Filter out empty orders for stats calculation
  const validOrders = orders.filter(order => order.order_id);

  const stats = {
    totalOrders: validOrders.length,
    pendingOrders: validOrders.filter(o => !o.final_weight || !o.total_price || !o.parcels?.[0]?.length).length,
    processingOrders: validOrders.filter(o => o.final_weight && o.total_price && o.parcels?.[0]?.length).length,
    shippedOrders: 0, // Firebase response doesn't include status, so we'll set this to 0
  };

  // 認証チェック中の表示
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">認証状態を確認中...</h3>
          <p className="text-gray-600">しばらくお待ちください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header storeId={storeId} user={isAuthenticated ? user : null} onLogout={isAuthenticated ? logout : undefined} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 認証状態の表示 */}
        {!isAuthenticated && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-blue-600 p-2 rounded-lg mr-3">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">認証状態</p>
                  <p className="text-lg font-bold text-blue-900">未認証（デモモード）</p>
                </div>
              </div>
              <button
                onClick={login}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2"
              >
                <Lock className="h-4 w-4" />
                <span>ログイン</span>
              </button>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              ログインすると実際のデータにアクセスできます
            </div>
          </div>
        )}


        {/* Error Display */}
        {error && storeId && isAuthenticated && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-red-800">エラー</p>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && storeId && isAuthenticated && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">注文データを読み込み中...</h3>
            <p className="text-gray-600">API Gatewayからデータを取得しています。</p>
          </div>
        )}

        {/* Stats Dashboard */}
        {!loading && orders.length > 0 && storeId && isAuthenticated && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="総注文数"
              value={stats.totalOrders}
              icon={Package}
              color="blue"
            />
            <StatsCard
              title="入力待ち"
              value={stats.pendingOrders}
              icon={Clock}
              color="amber"
            />
            <StatsCard
              title="入力完了"
              value={stats.processingOrders}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="発送済み"
              value={stats.shippedOrders}
              icon={TruckIcon}
              color="blue"
            />
          </div>
        )}

        {/* Orders Section */}
        {!loading && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">注文管理</h2>
                  <p className="text-gray-600">
                    顧客からの注文を確認し、総重量・合計金額・発送箱サイズを入力してください。
                  </p>
                </div>
                {/* 注文を更新ボタン - 常に表示 */}
                <button
                  onClick={loadOrders}
                  disabled={loading || !storeId}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>更新中...</span>
                    </>
                  ) : (
                    <>
                      <Package className="h-5 w-5" />
                      <span>注文を更新</span>
                    </>
                  )}
                </button>
                {storeId && isAuthenticated && (
                  <button
                    onClick={loadOrders}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>更新中...</span>
                      </>
                    ) : (
                      <>
                        <Package className="h-5 w-5" />
                        <span>注文を更新</span>
                      </>
                    )}
                  </button>
                )}
                {storeId && isAuthenticated && (
                  <button
                    onClick={loadOrders}
                    disabled={loading}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>更新中...</span>
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4" />
                        <span>最新データを取得</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Orders Grid */}
            <div className="space-y-6">
              {orders.map((order, index) => (
                <OrderCard
                  key={order.order_id || index}
                  order={order}
                  onOrderDataUpdate={handleOrderDataUpdate}
                  disabled={!storeId || !isAuthenticated}
                />
              ))}
            </div>
          </>
        )}

        {/* No Orders State */}
        {!loading && orders.length === 0 && !error && storeId && isAuthenticated && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">注文がありません</h3>
            <p className="text-gray-600">新しい注文が入ると、ここに表示されます。</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;