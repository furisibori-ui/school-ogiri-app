# 🖼️ 画像生成機能のセットアップ

## 📋 概要

画像は **Replicate（廉価）を優先**、未設定時のみ Comet の Gemini 2.5 Flash Image を使います。

| 優先順位 | サービス | モデル | 目安料金 | 環境変数 |
|----------|----------|--------|----------|----------|
| **1（推奨・廉価）** | Replicate | Stable Diffusion XL (SDXL) | **約0.3〜1円/枚** | `REPLICATE_API_TOKEN` |
| 2 | CometAPI | **Gemini 2.5 Flash Image**（安い・速い・バランス型） | 約6円/枚（$0.039/枚） | `COMET_API_KEY`（Replicate 未設定時のみ使用） |

- **REPLICATE_API_TOKEN を設定すると画像は Replicate（SDXL）で生成**され、コストを抑えられます。
- Comet のみ設定している場合は **Gemini 2.5 Flash Image** を使用します（Comet のなかでは安く・速く・バランスがよいモデル）。別モデルにしたい場合は環境変数 `COMET_IMAGE_MODEL` で指定可能（例: `gemini-2.0-flash-exp-image-generation`）。
- **無料枠**: Replicate は月50回まで無料
- **生成時間**: 5〜10秒/枚（Replicate）、数秒〜10秒程度（Comet）
- **Cometで「安くて速い、バランスがいい」モデル**: デフォルトの **Gemini 2.5 Flash Image** がその役割です（低レイテンシ・品質とコストのバランス）。変更する場合は `COMET_IMAGE_MODEL` を設定してください。

---

## 🚀 セットアップ手順

### ステップ1️⃣：Replicate アカウント作成

1. https://replicate.com/ にアクセス
2. 「Sign up」をクリック
3. GitHubアカウントでログイン

### ステップ2️⃣：APIトークン取得

1. ログイン後、右上のアイコンをクリック
2. 「Account settings」を選択
3. 左メニューから「API tokens」をクリック
4. 「Create token」をクリック
5. トークン名を入力（例：`school-ogiri-app`）
6. 「Create」をクリック
7. **表示されたトークンをコピー**（例：`r8_abc123...`）

### ステップ3️⃣：環境変数に設定

#### ローカル環境

`.env.local` ファイルに追加：

```bash
REPLICATE_API_TOKEN=r8_abc123...
```

#### Vercel環境

1. https://vercel.com/dashboard にアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」
4. 「Add New」をクリック
5. 入力：
   - **Name**: `REPLICATE_API_TOKEN`
   - **Value**: `r8_abc123...`（コピーしたトークン）
   - **Environment**: 全部にチェック
6. 「Save」をクリック

### ステップ4️⃣：再デプロイ

Vercelで自動的に再デプロイされます。

---

## 💰 料金について

### 無料枠

- **月50回まで無料**
- 1回の学校生成で**7枚**の画像（下記の内訳）
- **月5回程度まで無料**で学校生成可能

### 有料プラン

1回の学校生成で生成する画像（**7枚**）：
- 校章1、**校長の写真1**、部活動1、年間行事1、初代校舎1、**制服（白背景・男女1枚）1**、銅像1
- 施設紹介は写真なし（テキストのみ）。沿革には初代校舎の写真を流用。教員の写真は**校長のみ**。
- 7枚 × ¥0.5 = **約¥3.5**

月間コスト（7枚/回として）：
- 10回生成：約¥35
- 100回生成：約¥350
- 1,000回生成：約¥3,500

---

## 🔒 セキュリティ

- APIトークンはサーバーサイドのみで使用
- クライアントには露出しない
- 生成された画像は24時間で自動削除

---

## ⚙️ 機能の有効化/無効化・廉価版の選び方

- **廉価で画像を出したい**: `REPLICATE_API_TOKEN` を設定する。画像は Replicate（SDXL）で生成され、約0.3〜1円/枚で済みます。
- **Comet だけ設定**: 画像は Comet（Gemini 2.5 Flash Image）で生成されます（約6円/枚）。テキスト・楽曲は従来どおり Comet。
- **両方設定**: 画像は **Replicate 優先**（廉価）、テキスト・楽曲は Comet を使用します。
- **どちらも未設定**: プレースホルダー画像が表示されます。

```text
REPLICATE_API_TOKEN=設定済み  → 画像は Replicate（SDXL）＝廉価
REPLICATE_API_TOKEN=未設定
  COMET_API_KEY=設定済み      → 画像は Comet（Gemini 2.5 Flash Image）
  どちらも未設定              → プレースホルダー
```

---

## 🎨 生成される画像（計7枚）

1. **校章**
2. **校長の写真**（教員の写真は校長のみ）
3. **部活動**（1つのみ・場所の内容に則したもの）
4. **年間行事**（1つのみ・場所の内容に則したもの）
5. **初代校舎**（歴史的建造物。沿革セクションでも同一写真を流用）
6. **制服（冬服のみ）**（白背景に男女の生徒が立っている。場所にちなんだもの）
7. **銅像**（創立者像 1枚）

全て「**写ルンです風**」のレトロな雰囲気で生成されます。

---

## 🐛 トラブルシューティング

### 画像が生成されない

1. 環境変数が正しく設定されているか確認
2. Vercelを再デプロイ
3. ブラウザのコンソールでエラーを確認

### 料金が心配

1. Replicateダッシュボードで使用量を確認
2. 予算アラートを設定
3. 環境変数を削除すればプレースホルダーに戻る

---

## 🔍 画像・校歌が出ないとき（Vercel ログで確認するポイント）

Vercel の **Logs** や **Functions** のログで、次のメッセージを検索すると原因を絞り込めます。

| ログに含まれる文言 | 意味 | 対処 |
|--------------------|------|------|
| `Comet image API returned HTML instead of JSON` | Comet の**画像**APIが JSON ではなく HTML（エラーページ）を返した | Comet の認証・利用制限・エンドポイントを確認。API キーが有効か、画像用モデルが利用可能か確認 |
| `Comet image API non-OK:` | Comet 画像 API が 4xx/5xx を返した | 同上。ステータスコードと続くメッセージを確認 |
| `step2 generate-school-image returned non-JSON` | `/api/generate-school-image` が HTML を返した（Vercel エラーページ等） | 上記 Comet 側のログか、Vercel の Function エラーを確認 |
| `Suno API returned HTML instead of JSON` | Comet の**校歌（Suno）**APIが HTML を返した | 校歌用は Suno API。Comet の Suno 利用可否・認証・レート制限を確認 |
| `Blob upload failed` | Vercel Blob への画像アップロード失敗 | `BLOB_READ_WRITE_TOKEN` が設定されているか、Blob ストアが有効か確認 |
| `generate-school-image error:` | 画像生成 API 内で例外 | 直後のスタックトレースでどの処理で落ちたか確認 |

- **画像**は Comet の **Gemini 系画像モデル**（`generateContent`）を使用。**校歌**は Comet の **Suno API**（別エンドポイント）を使用します。Comet のサイトで「画像」と「Suno」の両方が有効か確認してください。
- ログは PDF やスクリーンショットだと検索しづらいため、Vercel のログ画面で **テキスト検索**（Ctrl+F / Cmd+F）で上記の文言を探すと効率的です。

---

## 📞 サポート

問題が発生した場合は、以下を確認してください：

- Replicate API トークンが有効か
- 環境変数が正しく設定されているか
- Vercelで再デプロイしたか

---

Happy generating! 🎨✨
