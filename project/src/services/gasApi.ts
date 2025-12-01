const GET_ORDERS_BASE_URL = 'https://9xylwit7o5.execute-api.ap-southeast-2.amazonaws.com/prod/shipments';
const SUBMIT_ORDER_BASE_URL = 'https://9xylwit7o5.execute-api.ap-southeast-2.amazonaws.com/prod/register-store/link-user-to-store';

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
  shipment_id?: string;
  setup: Setup;
  from_address?: FromAddress;
  to_address: ToAddress;
  products: Product[];
  parcels: Parcel[];
  parcel?: Parcel;
  total_price?: string;
  final_weight?: string;
  status?: string;
  order_status?: string;
  totalWeight?: number; // アプリ内で使用する重量フィールド
  customs?: any;
}

// 新しいAPIレスポンス形式を変換する関数
const transformApiResponse = (apiData: any): OrderData => {
  // shipment_idをorder_idとして使用
  const orderId = apiData.shipment_id || apiData.order_id || '';

  // parcel(単数)をparcels(配列)に変換
  const parcels = [];
  if (apiData.parcel) {
    parcels.push({
      weight: apiData.parcel.weight?.toString() || '',
      length: apiData.parcel.length?.toString() || '',
      width: apiData.parcel.width?.toString() || '',
      height: apiData.parcel.height?.toString() || '',
    });
  }

  // 重量をグラムからキログラムに変換
  let totalWeight: number | undefined;
  if (apiData.parcel?.weight && apiData.parcel.weight_unit === 'g') {
    totalWeight = apiData.parcel.weight / 1000;
  } else if (apiData.parcel?.weight) {
    totalWeight = apiData.parcel.weight;
  }

  const transformed: OrderData = {
    store_id: apiData.store_id,
    order_id: orderId,
    shipment_id: apiData.shipment_id,
    setup: apiData.setup || {},
    from_address: apiData.from_address || {},
    to_address: apiData.to_address || {},
    products: apiData.products || [],
    parcels: parcels,
    parcel: apiData.parcel,
    total_price: apiData.customs?.total_value?.toString() || apiData.total_price,
    final_weight: totalWeight?.toString(),
    status: apiData.order_status || apiData.status,
    order_status: apiData.order_status,
    totalWeight: totalWeight,
    customs: apiData.customs,
  };

  return transformed;
};

// フラット構造をネスト構造に変換する関数（旧形式用に残す）
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

    const accessToken = localStorage.getItem('access_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
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

    // 新しいAPI形式を変換
    const transformedData = data.map((item: any) => {
      // 新しい形式かフラット形式か判定
      if (item.shipment_id || item.parcel) {
        return transformApiResponse(item);
      } else {
        return transformFlatToNested(item);
      }
    });
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
    const accessToken = localStorage.getItem('access_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    console.log('=== POST Request Debug Info ===');
    console.log('URL:', url);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('Headers:', headers);
    console.log('===============================');

    const response = await fetch(url, {
      method: 'POST',
      headers,
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