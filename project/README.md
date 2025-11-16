# Yuimaru Ship Store Management

シンプルで効率的な店舗管理システムです。

## 🚀 機能

- **認証システム**: Amazon Cognito連携
- **注文管理**: リアルタイムデータ取得・更新
- **発送ラベル**: 自動生成・印刷機能
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応

## 🛠️ 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **スタイリング**: Tailwind CSS
- **ビルドツール**: Vite
- **アイコン**: Lucide React
- **認証**: Amazon Cognito
- **API**: AWS API Gateway + Firebase Cloud Run

## 📦 開発

### 環境構築

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

### 環境変数

認証機能を使用する場合は、以下の環境変数が必要です：

```env
VITE_COGNITO_USER_POOL_ID=your_user_pool_id
VITE_COGNITO_CLIENT_ID=your_client_id
VITE_API_GATEWAY_URL=your_api_gateway_url
```

## 🌐 デプロイ

### Netlify (推奨)

1. GitHubリポジトリをNetlifyに連携
2. ビルド設定:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. 自動デプロイが開始されます

### その他のプラットフォーム

- **Vercel**: `vercel --prod`
- **Firebase Hosting**: `firebase deploy`
- **GitHub Pages**: Actions経由でデプロイ

## 📱 使用方法

### デモモード

認証なしでUIを確認できます：
```
https://your-site.netlify.app/?store_id=demo
```

### 本番モード

1. Amazon Cognitoでログイン
2. 店舗IDを入力（初回のみ）
3. 注文データの確認・入力
4. 発送ラベルの生成・印刷

## 🔧 設定

### 店舗ID

URLパラメータで店舗IDを指定：
```
https://your-site.netlify.app/?store_id=your_store_id
```

### API エンドポイント

- **注文取得**: AWS API Gateway
- **データ更新**: Firebase Cloud Run
- **認証**: Amazon Cognito

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesをご利用ください。

---

**Yuimaru Ship** - 効率的な店舗管理を実現