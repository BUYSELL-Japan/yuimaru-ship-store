import { useState, useEffect } from 'react';

export const useStoreId = () => {
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const storeIdParam = urlParams.get('store_id');
    setStoreId(storeIdParam);
  }, []);

  return storeId;
};