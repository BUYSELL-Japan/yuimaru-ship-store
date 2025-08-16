import { useState, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  sub: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

const COGNITO_LOGIN_URL = 'https://ap-southeast-2usngbi9wi.auth.ap-southeast-2.amazoncognito.com/login?client_id=4nko3uuuls303nefg9b9ot9g9p&response_type=code&scope=email+https%3A%2F%2F9xylwit7o5.execute-api.ap-southeast-2.amazonaws.com%2Fprod%2Fstore_id+openid+profile&redirect_uri=https%3A%2F%2Fshop.yuimaru-ship.online';
const TOKEN_ENDPOINT = 'https://ap-southeast-2usngbi9wi.auth.ap-southeast-2.amazoncognito.com/oauth2/token';
const USER_INFO_ENDPOINT = 'https://ap-southeast-2usngbi9wi.auth.ap-southeast-2.amazoncognito.com/oauth2/userInfo';
const LINK_USER_STORE_ENDPOINT = 'https://9xylwit7o5.execute-api.ap-southeast-2.amazonaws.com/prod/register-store/link-user-to-store';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // URLからauthorization codeをチェック
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        // Authorization codeがある場合、トークンを取得
        await exchangeCodeForToken(code);
        // URLからcodeパラメータを削除
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // 既存のトークンをチェック
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        await fetchUserInfo(accessToken);
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: '4nko3uuuls303nefg9b9ot9g9p',
          code: code,
          redirect_uri: 'https://shop.yuimaru-ship.online',
        }),
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const tokenData = await response.json();
      
      // トークンを保存
      localStorage.setItem('access_token', tokenData.access_token);
      localStorage.setItem('refresh_token', tokenData.refresh_token);
      localStorage.setItem('id_token', tokenData.id_token);

      // ユーザー情報を取得
      await fetchUserInfo(tokenData.access_token);
      
      // ユーザーと店舗の紐付け処理
      await linkUserToStore(tokenData.id_token);
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  };

  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch(USER_INFO_ENDPOINT, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo = await response.json();
      
      setAuthState({
        isAuthenticated: true,
        user: {
          email: userInfo.email,
          name: userInfo.name || userInfo.email,
          sub: userInfo.sub,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      throw error;
    }
  };

  const linkUserToStore = async (idToken: string) => {
    try {
      // IDトークンからsubを取得
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      const sub = payload.sub;
      
      if (!sub) {
        throw new Error('Sub not found in ID token');
      }

      console.log('Linking user to store with sub:', sub);
      
      // 最初のリクエスト（subのみ）
      const response = await fetch(LINK_USER_STORE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sub }),
      });

      if (response.status === 200) {
        console.log('User successfully linked to store');
        return;
      } else if (response.status === 400) {
        // ストアIDの入力を求める
        await handleStoreIdInput(sub);
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.error('Error linking user to store:', error);
      // エラーが発生してもログインは継続
    }
  };

  const handleStoreIdInput = async (sub: string) => {
    return new Promise<void>((resolve) => {
      // ストアID入力用のモーダルを作成
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        padding: 32px;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        max-width: 400px;
        width: 90%;
      `;

      modalContent.innerHTML = `
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold; color: #1f2937;">ストアIDを入力してください</h2>
        <p style="margin: 0 0 24px 0; color: #6b7280; line-height: 1.5;">
          アカウントを店舗に紐付けるため、ストアIDの入力が必要です。
        </p>
        <input 
          type="text" 
          id="storeIdInput" 
          placeholder="例: store_123" 
          style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 24px;
            box-sizing: border-box;
          "
        />
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button 
            id="cancelBtn" 
            style="
              padding: 12px 24px;
              border: 2px solid #e5e7eb;
              background: white;
              color: #6b7280;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
            "
          >
            キャンセル
          </button>
          <button 
            id="confirmBtn" 
            style="
              padding: 12px 24px;
              border: none;
              background: #3b82f6;
              color: white;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
            "
          >
            確定
          </button>
        </div>
      `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      const input = modal.querySelector('#storeIdInput') as HTMLInputElement;
      const cancelBtn = modal.querySelector('#cancelBtn') as HTMLButtonElement;
      const confirmBtn = modal.querySelector('#confirmBtn') as HTMLButtonElement;

      // フォーカスを入力フィールドに設定
      setTimeout(() => input.focus(), 100);

      // Enterキーでの確定
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          confirmBtn.click();
        }
      });

      // キャンセルボタン
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve();
      });

      // 確定ボタン
      confirmBtn.addEventListener('click', async () => {
        const storeId = input.value.trim();
        
        if (!storeId) {
          alert('ストアIDを入力してください。');
          return;
        }

        // ローディング状態に変更
        confirmBtn.textContent = '処理中...';
        confirmBtn.disabled = true;
        confirmBtn.style.background = '#9ca3af';
        confirmBtn.style.cursor = 'not-allowed';

        try {
          // ストアIDとsubを送信
          const response = await fetch(LINK_USER_STORE_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sub, store_id: storeId }),
          });

          if (response.status === 200) {
            alert('ストアIDの紐付けが完了しました！');
            document.body.removeChild(modal);
            resolve();
          } else {
            const errorText = await response.text();
            alert(`エラーが発生しました: ${errorText}`);
            
            // ボタンを元に戻す
            confirmBtn.textContent = '確定';
            confirmBtn.disabled = false;
            confirmBtn.style.background = '#3b82f6';
            confirmBtn.style.cursor = 'pointer';
          }
        } catch (error) {
          console.error('Error submitting store ID:', error);
          alert('ネットワークエラーが発生しました。もう一度お試しください。');
          
          // ボタンを元に戻す
          confirmBtn.textContent = '確定';
          confirmBtn.disabled = false;
          confirmBtn.style.background = '#3b82f6';
          confirmBtn.style.cursor = 'pointer';
        }
      });

      // モーダル外クリックでキャンセル
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve();
        }
      });
    });
  };

  const login = () => {
    window.location.href = COGNITO_LOGIN_URL;
  };

  const logout = () => {
    // トークンを削除
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('id_token');
    
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });

    // Cognitoのログアウトエンドポイントにリダイレクト
    const logoutUrl = `https://ap-southeast-2usngbi9wi.auth.ap-southeast-2.amazoncognito.com/logout?client_id=4nko3uuuls303nefg9b9ot9g9p&logout_uri=${encodeURIComponent('https://shop.yuimaru-ship.online')}`;
    window.location.href = logoutUrl;
  };

  return {
    ...authState,
    login,
    logout,
  };
};