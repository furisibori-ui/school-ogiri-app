# 🗺️ Google Maps API トラブルシューティング

## 🔍 JavaScriptコンソールの確認方法

### ブラウザでコンソールを開く

#### **Chrome / Edge**
- **Mac**: `Command + Option + J`
- **Windows**: `Ctrl + Shift + J`

#### **Safari**
1. Safari → 環境設定 → 詳細 → 「メニューバーに"開発"メニューを表示」にチェック
2. `Command + Option + C` でコンソールを開く

#### **Firefox**
- **Mac**: `Command + Option + K`
- **Windows**: `Ctrl + Shift + K`

---

## ⚠️ よくあるエラーと対処法

### 1️⃣ **InvalidKeyMapError**

**エラーメッセージ**:
```
Google Maps JavaScript API error: InvalidKeyMapError
```

**原因**:
- APIキーが無効
- APIキーが間違っている
- APIキーが削除された

**対処法**:
1. Google Cloud Console でAPIキーを確認
2. `.env.local` のAPIキーが正しいか確認
3. 開発サーバーを再起動 (`npm run dev`)

---

### 2️⃣ **NotLoadedMapError / API未有効化**

**エラーメッセージ**:
```
Google Maps JavaScript API error: NotLoadedMapError
または
This API project is not authorized to use this API
```

**原因**:
- Maps JavaScript API が有効化されていない

**対処法**:
1. https://console.cloud.google.com/ にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「ライブラリ」
4. 「Maps JavaScript API」を検索
5. **「有効にする」** をクリック

**必要なAPI（全て有効化してください）**:
- ✅ Maps JavaScript API
- ✅ Geocoding API
- ✅ Places API

---

### 3️⃣ **RefererNotAllowedMapError**

**エラーメッセージ**:
```
Google Maps JavaScript API error: RefererNotAllowedMapError
```

**原因**:
- APIキーのリファラー制限により、現在のドメインからのアクセスが拒否されている

**対処法**:
1. Google Cloud Console → 認証情報 → APIキーを選択
2. 「アプリケーションの制限」セクションで以下のいずれかを選択：

#### **開発中（推奨）**:
- 「なし」を選択

#### **本番環境**:
- 「HTTPリファラー（ウェブサイト）」を選択
- 以下を追加：
  ```
  http://localhost:3000/*
  https://あなたのドメイン.vercel.app/*
  ```

3. 「保存」をクリック

---

### 4️⃣ **請求先アカウント未設定**

**エラーメッセージ**:
```
You must enable Billing on the Google Cloud Project
または
For development purposes only
```

**原因**:
- Google Cloud Projectに請求先アカウントが設定されていない

**対処法**:
1. https://console.cloud.google.com/billing にアクセス
2. 「請求先アカウントをリンク」をクリック
3. クレジットカード情報を登録

**重要**: 
- ✅ 月$200（約¥30,000）の無料枠があります
- ✅ 無料枠内なら料金は発生しません
- ✅ 予算アラートを設定できます

---

### 5️⃣ **API_KEY_INVALID**

**エラーメッセージ**:
```
API_KEY_INVALID
```

**原因**:
- APIキーの形式が間違っている
- 環境変数が正しく読み込まれていない

**対処法**:
1. `.env.local` のAPIキーを確認：
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...（実際のキー）
   ```

2. **スペースや改行がないか確認**

3. **開発サーバーを再起動**:
   ```bash
   # サーバーを停止（Ctrl+C）
   npm run dev
   ```

4. **ブラウザのキャッシュをクリア**:
   - Chrome: `Command + Shift + R` (Mac) / `Ctrl + Shift + R` (Windows)

---

### 6️⃣ **CORS エラー**

**エラーメッセージ**:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**原因**:
- Vercelデプロイ時の環境変数未設定

**対処法（Vercel）**:
1. https://vercel.com/dashboard にアクセス
2. プロジェクトを選択
3. Settings → Environment Variables
4. 以下を追加：
   - **Name**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - **Value**: `AIzaSy...`（実際のAPIキー）
   - **Environment**: 全部にチェック ✅
5. 「Save」→ 再デプロイ

---

## 🔧 環境変数の確認方法

### ローカル環境

1. `.env.local` ファイルが存在するか確認
   ```bash
   ls -la /Users/d18212/Desktop/plan02/school-ogiri-app/.env.local
   ```

2. 内容を確認
   ```bash
   cat .env.local
   ```

3. 期待される内容:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
   ```

### ブラウザのコンソールで確認

```javascript
console.log('API Key:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
```

**重要**: `NEXT_PUBLIC_` プレフィックスがないと、クライアントサイドで読み込めません！

---

## 📊 デバッグ手順

### ステップ1: APIキーの確認
```javascript
// ブラウザのコンソールで実行
console.log('API Key exists:', !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
```

### ステップ2: 開発サーバーの再起動
```bash
# 現在のサーバーを停止（Ctrl+C）
npm run dev
```

### ステップ3: ブラウザのキャッシュクリア
- **Chrome**: `Command + Shift + R` (Mac) / `Ctrl + Shift + R` (Windows)
- **Safari**: `Command + Option + E` → ページをリロード

### ステップ4: Google Cloud Console で確認

1. **APIが有効化されているか**:
   - https://console.cloud.google.com/apis/library
   - 検索: "Maps JavaScript API"
   - ステータスが「有効」になっているか確認

2. **請求先アカウントが設定されているか**:
   - https://console.cloud.google.com/billing
   - プロジェクトがリンクされているか確認

3. **APIキーの制限を確認**:
   - https://console.cloud.google.com/apis/credentials
   - APIキーをクリック
   - 「アプリケーションの制限」→「なし」に設定（開発中）

---

## 🚨 それでも解決しない場合

### 1. 新しいAPIキーを作成

1. https://console.cloud.google.com/apis/credentials にアクセス
2. 「認証情報を作成」→「APIキー」
3. 新しいキーをコピー
4. `.env.local` を更新
5. 開発サーバーを再起動

### 2. 新しいプロジェクトを作成

1. https://console.cloud.google.com/ にアクセス
2. 新しいプロジェクトを作成
3. 請求先アカウントを設定
4. 必要なAPIを有効化
5. APIキーを作成
6. `.env.local` を更新

---

## 📝 チェックリスト

Google Mapsが表示されない場合、以下を順番に確認してください：

- [ ] `.env.local` ファイルが存在する
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` が設定されている
- [ ] APIキーが `AIzaSy` で始まっている（正しい形式）
- [ ] 開発サーバーを再起動した
- [ ] ブラウザのキャッシュをクリアした
- [ ] Google Cloud で請求先アカウントを設定した
- [ ] Maps JavaScript API が有効化されている
- [ ] Geocoding API が有効化されている
- [ ] Places API が有効化されている
- [ ] APIキーの制限が「なし」になっている（開発中）
- [ ] Vercel の環境変数が設定されている（デプロイ時）

---

## 💡 よくある質問

### Q: 無料で使えますか？
**A**: はい！月$200（約¥30,000）の無料枠があります。通常の使用では無料枠内に収まります。

### Q: クレジットカード登録は必須ですか？
**A**: はい。無料枠を使う場合でもクレジットカード登録が必要です。

### Q: 予算上限は設定できますか？
**A**: はい。Google Cloud Console の「予算とアラート」で上限を設定できます。

### Q: localhost でしか動きません
**A**: Vercel の環境変数に `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` を設定してください。

---

## 📞 サポート

それでも解決しない場合は、以下の情報を添えてご連絡ください：

1. ブラウザのコンソールに表示されているエラーメッセージ（全文）
2. `.env.local` の内容（APIキーは最初の10文字のみ）
3. Google Cloud Console のAPIステータスのスクリーンショット
4. 使用しているブラウザとバージョン

---

Happy Mapping! 🗺️✨
