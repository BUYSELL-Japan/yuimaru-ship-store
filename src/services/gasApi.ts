const GET_ORDERS_BASE_URL = 'https://9xylwit7o5.execute-api.ap-southeast-2.amazonaws.com/prod/shipments';
const SUBMIT_ORDER_BASE_URL = 'https://updateorder-kjphqelq6a-uc.a.run.app';

export interface ToAddress {
  full_name: string;
  company?: string;
  email?: string;
  phone?: string;
  country: string;
  zip: string;
  province?: string;
  city: string;
  address1: string;
  address2?: string;
}

export interface FromAddress {
  full_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  country: string;
  zip?: string;
  province?: string;
  city?: string;
  address1?: string;
  address2?: string;
}

export interface Product {
  name: string;
  quantity: number;
  price?: string;
  hs_code?: string;
  origin_country?: string;
}

export interface Parcel {
  weight?: string;
  length?: string;
  width?: string;
  height?: string;
}

export interface Setup {
  carrier_id?: string;
  service?: string;
  ref_number?: string;
  pack_amount?: string;
  shipment_date: string;
  cool_options?: string;
  test?: string;
}

export interface OrderData {
  store_id: string;
  order_id: string;
  setup: Setup;
  from_address: FromAddress;
  to_address: ToAddress;
  products: Product[];
  parcels: Parcel[];
  total_price?: string;
  final_weight?: string;
  status?: string;
  totalWeight?: number; // アプリ内で使用する重量フィールド
}

// フラット構造をネスト構造に変換する関数
const transformFlatToNested = (flatData: any): OrderData => {
  const nested: any = {
    store_id: flatData.store_id,
    order_id: flatData.order_id,
    setup: {},
    from_address: {},
    to_address: {},
    products: [],
    parcels: [],
    total_price: flatData.total_price,
    final_weight: flatData.final_weight,
    status: flatData.status,
  };

  // final_weightがある場合はtotalWeightとして設定
  if (flatData.final_weight && !isNaN(parseFloat(flatData.final_weight))) {
    nested.totalWeight = parseFloat(flatData.final_weight);
  }

  // フラットなキーを処理
  Object.keys(flatData).forEach(key => {
    const value = flatData[key];
    
    if (key.startsWith('setup.')) {
      const setupKey = key.replace('setup.', '');
      nested.setup[setupKey] = value;
    } else if (key.startsWith('from_address.')) {
      const addressKey = key.replace('from_address.', '');
      nested.from_address[addressKey] = value;
    } else if (key.startsWith('to_address.')) {
      const addressKey = key.replace('to_address.', '');
      nested.to_address[addressKey] = value;
    } else if (key.startsWith('products[')) {
      // products[0].name のような形式を処理
      const match = key.match(/products\[(\d+)\]\.(.+)/);
      if (match) {
        const index = parseInt(match[1]);
        const productKey = match[2];
        
        // 配列のインデックスが存在しない場合は初期化
        if (!nested.products[index]) {
          nested.products[index] = {};
        }
        
        // quantityは数値に変換
        if (productKey === 'quantity' && value) {
          nested.products[index][productKey] = parseInt(value) || 0;
        } else {
          nested.products[index][productKey] = value;
        }
      }
    } else if (key.startsWith('parcels[')) {
      // parcels[0].weight のような形式を処理
      const match = key.match(/parcels\[(\d+)\]\.(.+)/);
      if (match) {
        const index = parseInt(match[1]);
        const parcelKey = match[2];
        
        // 配列のインデックスが存在しない場合は初期化
        if (!nested.parcels[index]) {
          nested.parcels[index] = {};
        }
        
        nested.parcels[index][parcelKey] = value;
      }
    }
  });

  // 空の要素を除去
  nested.products = nested.products.filter((product: any) => product && Object.keys(product).length > 0);
  nested.parcels = nested.parcels.filter((parcel: any) => parcel && Object.keys(parcel).length > 0);

  return nested as OrderData;
};

export const fetchOrdersFromGAS = async (storeId: string): Promise<OrderData[]> => {
  try {
    const url = `${GET_ORDERS_BASE_URL}?store_id=${encodeURIComponent(storeId)}`;
    console.log('Fetching orders from API Gateway:', url);
    
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
    console.log('API Gateway Response (Raw):', data);
    
    // API Gatewayからのレスポンスが配列でない場合の処理
    if (!Array.isArray(data)) {
      console.warn('API Gateway response is not an array:', data);
      return [];
    }

    // フラット構造をネスト構造に変換
    const transformedData = data.map(transformFlatToNested);
    console.log('Transformed Data:', transformedData);
    
    return transformedData;
  } catch (error) {
    console.error('Error fetching orders from API Gateway:', error);
    throw error;
  }
};

export const updateOrderDataInGAS = async (
  storeId: string, 
  orderId: string, 
  finalWeight?: number, 
  totalPrice?: number,
  boxSize?: { length: number; width: number; height: number }
): Promise<void> => {
  try {
    const url = SUBMIT_ORDER_BASE_URL;
    
    const requestBody: any = {
      store_id: storeId,
      order_id: orderId,
      action: 'updateOrderData'
    };

    // final_weightが指定されている場合は追加
    if (finalWeight !== undefined) {
      requestBody.final_weight = finalWeight.toString();
    }

    // total_priceが指定されている場合は追加
    if (totalPrice !== undefined) {
      requestBody.total_price = totalPrice.toString();
    }

    // 箱サイズが指定されている場合は追加
    if (boxSize) {
      requestBody['parcels[0].length'] = boxSize.length.toString();
      requestBody['parcels[0].width'] = boxSize.width.toString();
      requestBody['parcels[0].height'] = boxSize.height.toString();
    }

    // デバッグ用ログ出力
    console.log('=== POST Request Debug Info ===');
    console.log('URL:', url);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('Headers:', {
      'Content-Type': 'application/json',
    });
    console.log('===============================');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    // レスポンスの詳細をログ出力
    console.log('=== Response Debug Info ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    // レスポンステキストを取得（エラーの場合も含む）
    const responseText = await response.text();
    console.log('Response Text:', responseText);
    console.log('===========================');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
    }

    // JSONパースを試行
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Parsed Response:', result);
    } catch (parseError) {
      console.log('Response is not JSON, using as text:', responseText);
      result = responseText;
    }

  } catch (error) {
    console.error('Error updating order data in Firebase Cloud Run:', error);
    throw error;
  }
};

// 後方互換性のために残しておく
export const updateWeightInGAS = async (storeId: string, orderId: string, weight: number): Promise<void> => {
  return updateOrderDataInGAS(storeId, orderId, weight);
};