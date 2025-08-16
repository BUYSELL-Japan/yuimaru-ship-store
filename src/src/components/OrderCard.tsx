import React from 'react';
import { Package, User, MapPin, Phone, Mail, Globe, Weight, Calendar, DollarSign, Save, Box, FileText } from 'lucide-react';
import { OrderData } from '../services/gasApi';

interface OrderCardProps {
  order: OrderData;
  onOrderDataUpdate: (orderId: string, finalWeight?: number, totalPrice?: number, boxSize?: { length: number; width: number; height: number }) => void;
  disabled?: boolean; // 入力無効化フラグを追加
}

// 発送箱サイズの定義
const BOX_SIZES = [
  { label: '60サイズ (20×20×20cm)', value: '60', length: 20, width: 20, height: 20 },
  { label: '80サイズ (30×25×25cm)', value: '80', length: 30, width: 25, height: 25 },
  { label: '100サイズ (40×30×30cm)', value: '100', length: 40, width: 30, height: 30 },
  { label: '120サイズ (50×35×35cm)', value: '120', length: 50, width: 35, height: 35 },
  { label: '140サイズ (60×40×40cm)', value: '140', length: 60, width: 40, height: 40 },
  { label: '160サイズ (70×45×45cm)', value: '160', length: 70, width: 45, height: 45 },
  { label: '180サイズ (80×50×50cm)', value: '180', length: 80, width: 50, height: 50 },
  { label: '200サイズ (90×55×55cm)', value: '200', length: 90, width: 55, height: 55 },
];

export const OrderCard: React.FC<OrderCardProps> = ({ order, onOrderDataUpdate, disabled = false }) => {
  // グラム単位で状態管理（表示用）
  const [finalWeightGrams, setFinalWeightGrams] = React.useState<string>(
    order.final_weight ? (parseFloat(order.final_weight) * 1000).toString() : ''
  );
  const [totalPrice, setTotalPrice] = React.useState<string>(
    order.total_price || ''
  );
  const [selectedBoxSize, setSelectedBoxSize] = React.useState<string>('');
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 現在の箱サイズを取得（既存データから）
  React.useEffect(() => {
    if (order.parcels && order.parcels[0]) {
      const parcel = order.parcels[0];
      const currentLength = parseInt(parcel.length || '0');
      const currentWidth = parseInt(parcel.width || '0');
      const currentHeight = parseInt(parcel.height || '0');
      
      // 既存のサイズと一致するものを探す
      const matchingSize = BOX_SIZES.find(size => 
        size.length === currentLength && 
        size.width === currentWidth && 
        size.height === currentHeight
      );
      
      if (matchingSize) {
        setSelectedBoxSize(matchingSize.value);
      }
    }
  }, [order.parcels]);

  // final_weightが更新された時にグラム表示も更新
  React.useEffect(() => {
    if (order.final_weight) {
      setFinalWeightGrams((parseFloat(order.final_weight) * 1000).toString());
    }
  }, [order.final_weight]);

  const handleSubmit = async () => {
    if (disabled) {
      alert('デモモードでは入力できません。URLに店舗IDを指定してください。');
      return;
    }

    const weightGrams = parseFloat(finalWeightGrams);
    const price = parseFloat(totalPrice);
    
    // バリデーション
    if (!weightGrams || weightGrams <= 0) {
      alert('有効な重量を入力してください。');
      return;
    }
    
    if (!price || price <= 0) {
      alert('有効な金額を入力してください。');
      return;
    }

    if (!selectedBoxSize) {
      alert('発送箱サイズを選択してください。');
      return;
    }

    const selectedSize = BOX_SIZES.find(size => size.value === selectedBoxSize);
    if (!selectedSize) {
      alert('有効な箱サイズが選択されていません。');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // グラムをキログラムに変換してFirebaseに送信
      const weightKg = weightGrams / 1000;
      await onOrderDataUpdate(order.order_id, weightKg, price, {
        length: selectedSize.length,
        width: selectedSize.width,
        height: selectedSize.height
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update order data:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFinalWeightGrams(order.final_weight ? (parseFloat(order.final_weight) * 1000).toString() : '');
    setTotalPrice(order.total_price || '');
    // 箱サイズも元に戻す
    if (order.parcels && order.parcels[0]) {
      const parcel = order.parcels[0];
      const currentLength = parseInt(parcel.length || '0');
      const currentWidth = parseInt(parcel.width || '0');
      const currentHeight = parseInt(parcel.height || '0');
      
      const matchingSize = BOX_SIZES.find(size => 
        size.length === currentLength && 
        size.width === currentWidth && 
        size.height === currentHeight
      );
      
      setSelectedBoxSize(matchingSize?.value || '');
    } else {
      setSelectedBoxSize('');
    }
  };

  const handleShippingLabelCheck = async () => {
    if (disabled) {
      alert('デモモードでは発送ラベルを確認できません。');
      return;
    }
    
    try {
      // FirebaseからGETリクエストで注文データを取得
      const url = `https://getorders-kjphqelq6a-uc.a.run.app?store_id=${encodeURIComponent(order.store_id)}`;
      console.log('Fetching shipping label data from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Shipping label data response:', data);
      
      // 該当する注文を検索
      const targetOrder = Array.isArray(data) 
        ? data.find((orderData: any) => orderData.order_id === order.order_id)
        : null;

      if (!targetOrder) {
        alert('該当する注文データが見つかりませんでした。');
        return;
      }

      // 送料と合計金額を計算
      const itemPrice = targetOrder.total_price ? parseFloat(targetOrder.total_price) : 0;
      const shippingCost = targetOrder.shipping_cost ? parseFloat(targetOrder.shipping_cost) : 0;
      const grandTotal = itemPrice + shippingCost;

      // label_urlを取得
      const labelUrl = targetOrder.label_url || '';

      // ポップアップ用のHTMLを生成
      const popupContent = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>発送ラベル確認 - 注文 #${order.order_id}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hiragino Sans', 'Noto Sans CJK JP', sans-serif;
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              color: #1f2937;
              line-height: 1.6;
              min-height: 100vh;
            }
            .container {
              max-width: 900px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              color: white;
              padding: 32px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .header::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
              opacity: 0.3;
            }
            .header-content {
              position: relative;
              z-index: 1;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .header p {
              margin: 0;
              opacity: 0.9;
              font-size: 18px;
            }
            .content {
              padding: 32px;
            }
            .section {
              margin-bottom: 32px;
              background: #f8fafc;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              overflow: hidden;
            }
            .section-header {
              background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
              padding: 20px 24px;
              border-bottom: 1px solid #e2e8f0;
            }
            .section-header h2 {
              margin: 0;
              font-size: 20px;
              font-weight: 700;
              color: #1e293b;
              display: flex;
              align-items: center;
            }
            .section-header h2::before {
              content: "👤";
              margin-right: 12px;
              font-size: 24px;
            }
            .section-header.package h2::before {
              content: "📦";
            }
            .section-body {
              padding: 24px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 20px;
            }
            .info-item {
              background: white;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              transition: all 0.2s ease;
            }
            .info-item:hover {
              border-color: #3b82f6;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .info-label {
              font-weight: 600;
              color: #6b7280;
              margin-bottom: 8px;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-value {
              color: #1f2937;
              font-size: 18px;
              font-weight: 500;
              word-break: break-word;
            }
            .highlight {
              background: linear-gradient(135deg, #dbeafe, #bfdbfe);
              border-color: #3b82f6;
              position: relative;
            }
            .highlight::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 4px;
              height: 100%;
              background: #3b82f6;
              border-radius: 0 4px 4px 0;
            }
            .highlight .info-value {
              font-weight: 700;
              color: #1d4ed8;
            }
            .total-section {
              background: linear-gradient(135deg, #f0fdf4, #dcfce7);
              border: 2px solid #22c55e;
              border-radius: 12px;
              padding: 24px;
              margin-top: 32px;
              position: relative;
            }
            .total-section::before {
              content: '💰';
              position: absolute;
              top: -12px;
              left: 24px;
              background: white;
              padding: 0 8px;
              font-size: 20px;
            }
            .total-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
              font-size: 16px;
              padding: 8px 0;
            }
            .total-item:last-child {
              margin-bottom: 0;
            }
            .total-item.grand-total {
              border-top: 2px solid #22c55e;
              padding-top: 16px;
              margin-top: 16px;
              font-size: 22px;
              font-weight: bold;
              color: #15803d;
            }
            .total-label {
              font-weight: 600;
            }
            .total-value {
              font-weight: 700;
              font-family: 'Courier New', monospace;
            }
            .print-button {
              background: linear-gradient(135deg, #10b981, #059669);
              color: white;
              border: none;
              padding: 16px 32px;
              border-radius: 12px;
              font-size: 18px;
              font-weight: 700;
              cursor: pointer;
              margin-top: 32px;
              width: 100%;
              transition: all 0.3s ease;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .print-button:hover:not(:disabled) {
              background: linear-gradient(135deg, #059669, #047857);
              transform: translateY(-2px);
              box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1);
            }
            .print-button:disabled {
              background: linear-gradient(135deg, #9ca3af, #6b7280);
              cursor: not-allowed;
              transform: none;
            }
            .error-message {
              text-align: center;
              color: #ef4444;
              margin-top: 16px;
              padding: 12px;
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 8px;
              font-weight: 600;
            }
            @media print {
              body { 
                background: white;
                padding: 0;
              }
              .container { 
                box-shadow: none;
                border-radius: 0;
              }
              .print-button, .error-message { 
                display: none;
              }
            }
            @media (max-width: 768px) {
              .container {
                margin: 10px;
                border-radius: 12px;
              }
              .content {
                padding: 20px;
              }
              .info-grid {
                grid-template-columns: 1fr;
              }
              .total-item {
                font-size: 14px;
              }
              .total-item.grand-total {
                font-size: 18px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-content">
                <h1>🚚 発送ラベル確認</h1>
                <p>注文 #${order.order_id}</p>
              </div>
            </div>
            
            <div class="content">
              <!-- 顧客情報 -->
              <div class="section">
                <div class="section-header">
                  <h2>顧客情報</h2>
                </div>
                <div class="section-body">
                  <div class="info-grid">
                    <div class="info-item highlight">
                      <div class="info-label">宛名</div>
                      <div class="info-value">${targetOrder['to_address.full_name'] || '未入力'}</div>
                    </div>
                    <div class="info-item highlight">
                      <div class="info-label">オーダーID</div>
                      <div class="info-value">${targetOrder.order_id || '未入力'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">国</div>
                      <div class="info-value">${targetOrder['to_address.country'] || '未入力'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">州</div>
                      <div class="info-value">${targetOrder['to_address.province'] || '未入力'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">シティ</div>
                      <div class="info-value">${targetOrder['to_address.city'] || '未入力'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">住所1</div>
                      <div class="info-value">${targetOrder['to_address.address1'] || '未入力'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">住所2</div>
                      <div class="info-value">${targetOrder['to_address.address2'] || '未入力'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 荷物情報 -->
              <div class="section">
                <div class="section-header package">
                  <h2>荷物情報</h2>
                </div>
                <div class="section-body">
                  <div class="info-grid">
                    <div class="info-item highlight">
                      <div class="info-label">商品名</div>
                      <div class="info-value">${targetOrder['products[0].name'] || '未入力'}</div>
                    </div>
                    <div class="info-item highlight">
                      <div class="info-label">数量</div>
                      <div class="info-value">${targetOrder['products[0].quantity'] || '未入力'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">商品金額</div>
                      <div class="info-value">¥${targetOrder.total_price ? parseFloat(targetOrder.total_price).toLocaleString() : '未入力'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">送料</div>
                      <div class="info-value">¥${targetOrder.shipping_cost ? parseFloat(targetOrder.shipping_cost).toLocaleString() : '未入力'}</div>
                    </div>
                    <div class="info-item highlight">
                      <div class="info-label">総重量（グラム）</div>
                      <div class="info-value">${targetOrder.final_weight ? (parseFloat(targetOrder.final_weight) * 1000).toLocaleString() + 'g' : '未入力'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">運送会社</div>
                      <div class="info-value">国際郵便EMS</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 合計金額セクション -->
              <div class="total-section">
                <div class="total-item">
                  <span class="total-label">商品金額:</span>
                  <span class="total-value">¥${itemPrice.toLocaleString()}</span>
                </div>
                <div class="total-item">
                  <span class="total-label">送料:</span>
                  <span class="total-value">¥${shippingCost.toLocaleString()}</span>
                </div>
                <div class="total-item grand-total">
                  <span class="total-label">合計金額:</span>
                  <span class="total-value">¥${grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <button 
                class="print-button" 
                onclick="handlePrintLabel()"
                ${!labelUrl ? 'disabled' : ''}
              >
                🖨️ 発送ラベルを印刷
              </button>
              
              ${!labelUrl ? '<div class="error-message">⚠️ 発送ラベルURLが取得できませんでした</div>' : ''}
            </div>
          </div>

          <script>
            function handlePrintLabel() {
              const labelUrl = '${labelUrl}';
              if (labelUrl) {
                // 新しいウィンドウで発送ラベルを開く
                const labelWindow = window.open(labelUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
                if (!labelWindow) {
                  alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
                }
              } else {
                alert('発送ラベルURLが取得できませんでした。');
              }
            }
          </script>
        </body>
        </html>
      `;

      // 新しいウィンドウでポップアップを開く
      const popup = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
      if (popup) {
        popup.document.write(popupContent);
        popup.document.close();
        popup.focus();
      } else {
        alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
      }

    } catch (error) {
      console.error('Error fetching shipping label data:', error);
      alert('発送ラベルデータの取得に失敗しました。もう一度お試しください。');
    }
  };

  const handleEditClick = () => {
    if (disabled) {
      alert('デモモードでは編集できません。URLに ?store_id=YOUR_STORE_ID を追加してください。');
      return;
    }
    setIsEditing(true);
  };

  const isDataComplete = order.final_weight && order.total_price && order.parcels && order.parcels[0] && order.parcels[0].length;
  const canSubmit = finalWeightGrams && totalPrice && selectedBoxSize && 
                   parseFloat(finalWeightGrams) > 0 && parseFloat(totalPrice) > 0;

  // 現在の箱サイズ情報を取得
  const getCurrentBoxInfo = () => {
    if (order.parcels && order.parcels[0]) {
      const parcel = order.parcels[0];
      return `${parcel.length}×${parcel.width}×${parcel.height}cm`;
    }
    return '未設定';
  };

  // Don't render if order has no ID (empty template)
  if (!order.order_id) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 ${disabled ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${disabled ? 'from-gray-500 to-gray-600' : 'from-blue-600 to-blue-700'} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-white" />
            <h3 className="text-xl font-bold text-white">
              注文 #{order.order_id}
              {disabled && <span className="text-sm font-normal ml-2">(デモ)</span>}
            </h3>
          </div>
          <div className="flex items-center space-x-4">
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isDataComplete 
                ? 'bg-green-100 text-green-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {isDataComplete ? '入力完了' : '入力待ち'}
            </div>
            <div className="flex items-center space-x-2 text-blue-100">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                出荷日: {order.setup?.shipment_date ? new Date(order.setup.shipment_date).toLocaleDateString('ja-JP') : '未設定'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Customer Information */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            宛先情報
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <User className="h-4 w-4 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-700">宛名</p>
                  <p className="text-gray-900">{order.to_address?.full_name || '未入力'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Globe className="h-4 w-4 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-700">国</p>
                  <p className="text-gray-900">{order.to_address?.country || '未入力'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-700">郵便番号</p>
                  <p className="text-gray-900">{order.to_address?.zip || '未入力'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-700">市区町村</p>
                  <p className="text-gray-900">{order.to_address?.city || '未入力'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-700">住所1</p>
                  <p className="text-gray-900">{order.to_address?.address1 || '未入力'}</p>
                </div>
              </div>
              {order.to_address?.address2 && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">住所2</p>
                    <p className="text-gray-900">{order.to_address.address2}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 mr-2 text-blue-600" />
            商品一覧
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">数量</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.products?.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{product.name || '商品名未入力'}</td>
                    <td className="px-4 py-3 text-gray-600">{product.quantity || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Data Input Section */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold text-gray-900">注文データ入力</h4>
            <div className="flex items-center space-x-3">
              {/* 発送ラベル確認ボタン - データ完了時のみ表示 */}
              {isDataComplete && !isEditing && (
                <button
                  onClick={handleShippingLabelCheck}
                  disabled={disabled}
                  className={`${
                    disabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                  } text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center space-x-2 shadow-lg`}
                >
                  <FileText className="h-4 w-4" />
                  <span>発送ラベルの確認</span>
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={handleEditClick}
                  disabled={disabled}
                  className={`${
                    disabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2`}
                >
                  <Save className="h-4 w-4" />
                  <span>{isDataComplete ? 'データを編集' : 'データを入力'}</span>
                </button>
              )}
            </div>
          </div>
          
          {!isEditing ? (
            /* Display Mode */
            <div className="grid md:grid-cols-3 gap-6">
              {/* Weight Display */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                  <Weight className="h-4 w-4 mr-2 text-blue-600" />
                  総重量
                </h5>
                <p className="text-sm text-gray-600 mb-2">航空便配送用の総重量</p>
                <p className="text-2xl font-bold text-gray-900">
                  {order.final_weight ? `${(parseFloat(order.final_weight) * 1000).toLocaleString()}g` : '未入力'}
                </p>
                {order.final_weight && (
                  <p className="text-sm text-gray-500 mt-1">
                    ({parseFloat(order.final_weight)}kg)
                  </p>
                )}
              </div>

              {/* Price Display */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                  合計金額
                </h5>
                <p className="text-sm text-gray-600 mb-2">注文の合計金額</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalPrice ? `¥${parseFloat(totalPrice).toLocaleString()}` : '未入力'}
                </p>
              </div>

              {/* Box Size Display */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                  <Box className="h-4 w-4 mr-2 text-purple-600" />
                  発送箱サイズ
                </h5>
                <p className="text-sm text-gray-600 mb-2">配送用の箱サイズ</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getCurrentBoxInfo()}
                </p>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Weight Input */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h5 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <Weight className="h-4 w-4 mr-2 text-blue-600" />
                    総重量 (final_weight)
                  </h5>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      総重量 (g) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={finalWeightGrams}
                      onChange={(e) => setFinalWeightGrams(e.target.value)}
                      placeholder="例: 1500"
                      step="1"
                      min="0"
                      disabled={disabled}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        disabled ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      グラム単位で入力してください（例: 1500g = 1.5kg）
                    </p>
                    {finalWeightGrams && parseFloat(finalWeightGrams) > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        = {(parseFloat(finalWeightGrams) / 1000).toFixed(3)}kg
                      </p>
                    )}
                  </div>
                </div>

                {/* Price Input */}
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <h5 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                    合計金額 (total_price)
                  </h5>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      合計金額 (円) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      placeholder="例: 5000"
                      step="1"
                      min="0"
                      disabled={disabled}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 ${
                        disabled ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      整数で入力してください（例: 5000円）
                    </p>
                  </div>
                </div>
              </div>

              {/* Box Size Selection */}
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                <h5 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <Box className="h-4 w-4 mr-2 text-purple-600" />
                  発送箱サイズ選択
                </h5>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    箱サイズ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBoxSize}
                    onChange={(e) => setSelectedBoxSize(e.target.value)}
                    disabled={disabled}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 bg-white ${
                      disabled ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">箱サイズを選択してください</option>
                    {BOX_SIZES.map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    商品に適した箱サイズを選択してください
                  </p>
                  {selectedBoxSize && (
                    <div className="mt-2 p-2 bg-white rounded border">
                      <p className="text-sm text-gray-700">
                        選択中: <span className="font-medium">
                          {BOX_SIZES.find(s => s.value === selectedBoxSize)?.label}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center space-x-2"
                >
                  <span>キャンセル</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting || disabled}
                  className={`${
                    disabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400'
                  } disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2 shadow-lg`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>送信中...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>データを確定</span>
                    </>
                  )}
                </button>
              </div>

              {/* 発送ラベル確認ボタン - 編集モード時は下部に表示 */}
              {isDataComplete && (
                <div className="flex justify-center pt-4 border-t border-gray-200">
                  <button
                    onClick={handleShippingLabelCheck}
                    disabled={disabled}
                    className={`${
                      disabled 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                    } text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center space-x-2 shadow-lg`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>発送ラベルの確認</span>
                  </button>
                </div>
              )}

              {/* Help Text */}
              <div className={`${disabled ? 'bg-gray-50 border-gray-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4`}>
                <div className="flex items-start space-x-3">
                  <div className={`${disabled ? 'bg-gray-100' : 'bg-amber-100'} p-1 rounded-full`}>
                    <Package className={`h-4 w-4 ${disabled ? 'text-gray-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h6 className={`text-sm font-medium ${disabled ? 'text-gray-800' : 'text-amber-800'} mb-1`}>
                      {disabled ? 'デモモードについて' : '入力について'}
                    </h6>
                    <p className={`text-sm ${disabled ? 'text-gray-700' : 'text-amber-700'}`}>
                      {disabled 
                        ? 'デモモードでは入力機能が無効になっています。実際の機能を使用するには、URLに ?store_id=YOUR_STORE_ID を追加してください。'
                        : '総重量（グラム）、合計金額、発送箱サイズの3つすべてを入力してから「データを確定」ボタンを押してください。重量はグラム単位で入力され、自動的にキログラムに変換されてFirebaseに送信されます。データ確定後は「発送ラベルの確認」ボタンで詳細情報を確認できます。'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};