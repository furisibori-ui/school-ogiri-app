# 画像・楽曲 API 連携の方法

学校生成時に **画像（Replicate）** と **校歌の楽曲（Suno / CometAPI）** を有効にする手順です。

---

## 1. 画像生成（Replicate）

### 何が有効になるか
- **学校概要の画像**が、AIで生成された写ルンです風の画像になります。
- キーが無い場合は「Image Generation Disabled」のプレースホルダー画像が表示されます。

### 手順

1. **Replicate でアカウント作成**
   - https://replicate.com/ にアクセス
   - 「Sign up」→ GitHub でログイン

2. **API トークン取得**
   - ログイン後 → 右上アイコン → **Account settings** → **API tokens**
   - **Create token** → 名前（例: `school-ogiri`）→ **Create**
   - 表示されたトークン（`r8_xxxx...`）をコピー

3. **環境変数に設定**

   **ローカル（`.env.local`）**
   ```bash
   REPLICATE_API_TOKEN=r8_ここにトークンを貼り付け
   ```

   **Vercel**
   - ダッシュボード → プロジェクト → **Settings** → **Environment Variables**
   - Name: `REPLICATE_API_TOKEN`  
   - Value: コピーしたトークン  
   - **Save** 後、再デプロイ

4. **本番で画像APIを叩く場合**
   - サーバーから `/api/generate-image` を呼ぶため、本番URLが必要です。
   - Vercel の **Environment Variables** に次を追加：
   - Name: `NEXT_PUBLIC_BASE_URL`  
   - Value: `https://あなたのドメイン.vercel.app`（末尾スラッシュなし）

### 料金の目安
- Replicate の SDXL: 約 0.3〜1 円/枚
- 1 回の学校生成で **概要画像 1 枚** のみ生成（現状）

---

## 2. 楽曲生成（Suno AI / CometAPI）

### 何が有効になるか
- Claude が生成した **校歌の歌詞** を、Suno AI で曲にして **校歌を聴く** ボタンで再生できます。
- キーが無い場合は歌詞のみ表示され、再生ボタンは出ません。

### 手順

1. **CometAPI でアカウント作成**
   - https://www.cometapi.com/ にアクセス
   - **Sign Up** → メールとパスワードで登録

2. **API キー取得**
   - ログイン → **ダッシュボード** → **API Keys**
   - **Create New Key** → 名前（例: `school-ogiri`）→ **Create**
   - 表示されたキー（`sk-...`）をコピー

3. **クレジットのチャージ**
   - CometAPI は従量課金です。**Billing** → **Add Credits** で $5 程度をチャージ。

4. **環境変数に設定**

   **ローカル（`.env.local`）**
   ```bash
   COMET_API_KEY=sk_ここにキーを貼り付け
   ```

   **Vercel**
   - Name: `COMET_API_KEY`  
   - Value: コピーしたキー  
   - **Save** 後、再デプロイ

5. **本番で楽曲APIを叩く場合**
   - 画像と同様、サーバーから `/api/generate-audio` を呼びます。
   - `NEXT_PUBLIC_BASE_URL` を本番URLにしておくと、楽曲生成も本番で動作します。

### 料金の目安
- 約 **21 円/曲**（1 回の学校生成で校歌 1 曲）

---

## 3. まとめ：必要な環境変数

| 用途       | 変数名                  | どこで取得           |
|------------|-------------------------|----------------------|
| 画像生成   | `REPLICATE_API_TOKEN`   | https://replicate.com |
| 楽曲生成   | `COMET_API_KEY`         | https://www.cometapi.com |
| 本番用URL  | `NEXT_PUBLIC_BASE_URL`  | あなたのVercelのURL（例: `https://xxx.vercel.app`） |

### `.env.local` の例（画像・楽曲どちらも有効）

```bash
# 既存
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
ANTHROPIC_API_KEY=...

# 画像
REPLICATE_API_TOKEN=r8_xxxx...

# 楽曲
COMET_API_KEY=sk_xxxx...

# 本番で画像・楽曲を生成する場合のみ
# NEXT_PUBLIC_BASE_URL=https://あなたのアプリ.vercel.app
```

---

## 4. 動作確認

1. `.env.local` を保存し、開発サーバーを再起動（`npm run dev`）。
2. 地図でピンを打ち、学校を 1 回生成。
3. **画像**: 学校概要に写ルンです風の画像が出ていれば OK。
4. **楽曲**: 校歌セクションに「🎵 校歌を聴く」が出て、再生できれば OK。

エラーが出る場合は、ターミナル（または Vercel の **Functions** ログ）で `🏫 学校概要の画像生成開始` / `🎵 校歌の楽曲生成開始` のログを確認してください。
