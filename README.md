# 位置情報連動型・架空学校生成サイト

Google Maps上で指定した場所の地理・地域情報をもとに、AIが独自の「大喜利理論」を用いて、その土地ならではの**架空の学校ウェブサイト**を自動生成するエンターテインメント・アプリケーションです。

## 🎯 コア体験

1. **Map Interaction:** ユーザーがGoogleマップ上の任意の場所にピンを刺す
2. **Loading:** 「文部科学省に認可申請中...」などユニークなローディング演出
3. **Generation:** その土地の特性（特産、地形、歴史）が極端にデフォルメされた学校サイトが表示
4. **Multimedia:** 校歌の歌詞、校長の挨拶、奇妙な部活動の環境音、過酷な行事の写真が生成

## 🛠 技術スタック

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Maps:** Google Maps API (Geocoding, Places)
- **AI Logic:** Claude 3.5 Sonnet (Anthropic)
- **Image Gen:** Stable Diffusion XL (Replicate API) - 写ルンです風
- **Audio Gen:** Suno AI v5 (CometAPI経由) - 校歌自動作曲

## 📋 必要な環境

- Node.js 18.x 以上
- npm または yarn

## 🎭 モックモード（完全無料！）

APIキーがなくても動作を確認できる**モックモード**を搭載しています。

### モックモードとは？

- 環境変数を設定しない場合、自動的にサンプルデータを表示
- AI、画像生成、音声生成をシミュレート
- **完全無料**で実際の画面が見られる

### モックモードでの動作

- ✅ **テキスト**: サンプルの学校データを表示（Anthropic APIなしでもOK）
- ✅ **画像**: プレースホルダー画像を表示（Replicate APIなしでもOK）
- ✅ **音声**: 音声なし（Comet APIなしでもOK）
- ⚠️ **Google Maps**: APIキーがないと地図が表示されない

### 推奨セットアップ順序

1. **まずテスト**: API設定なしで動作確認（テストボタンで生成）
2. **Google Maps**: 地図でピンを刺せるように
3. **Claude**: AIによる本格的な学校生成
4. **Replicate**: 写ルンです風の画像生成
5. **Suno**: 校歌の音楽生成

---

## 🚀 セットアップ手順

### 1. Node.jsのインストール（まだの場合）

macOSの場合：
```bash
# Homebrewをインストール（まだの場合）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.jsをインストール
brew install node
```

### 2. 依存関係のインストール

```bash
cd school-ogiri-app
npm install
```

### 3. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、各APIキーを設定してください：

```bash
cp .env.local.example .env.local
```

`.env.local` に以下の情報を入力：

```env
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=あなたのGoogle Maps APIキー

# Claude AI (学校データ生成)
ANTHROPIC_API_KEY=あなたのAnthropic APIキー

# Replicate (画像生成 - Stable Diffusion XL)
REPLICATE_API_TOKEN=あなたのReplicate APIトークン

# Comet API (音楽生成 - Suno AI)
COMET_API_KEY=あなたのComet APIキー
```

### 4. APIキーの取得方法

#### Google Maps API（必須）
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成
3. 「APIとサービス」→「認証情報」→「APIキーを作成」
4. 以下のAPIを有効化：
   - Maps JavaScript API
   - Geocoding API
   - Places API

#### Anthropic API (Claude) - 学校データ生成
1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. アカウント作成後、APIキーを取得

#### Replicate API - 画像生成（写ルンです風）
1. [Replicate](https://replicate.com/) にアクセス
2. GitHubでSign up
3. Account settings → API tokens → Create token
4. **料金**: 約¥0.5/枚、月50回まで無料

#### Comet API - 音楽生成（Suno AI）
1. [CometAPI](https://www.cometapi.com/) にアクセス
2. アカウント作成後、APIキーを取得
3. クレジットをチャージ（$5〜）
4. **料金**: 約¥21/曲

📖 **詳細な設定手順**:
- **Google Maps**: `TROUBLESHOOTING_GOOGLE_MAPS.md` ← マップが表示されない場合
- 画像生成: `SETUP_IMAGE_GENERATION.md`
- 音楽生成: `SETUP_SUNO_AUDIO.md`

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 📖 使い方

1. 開発サーバーを起動後、ブラウザで地図が表示されます
2. 地図上の任意の場所をクリックしてピンを刺します
3. 30秒〜1分ほどでAIが学校サイトを生成します
4. 生成された学校サイトには以下が含まれます：
   - 学校概要
   - 校長挨拶（写真付き）
   - 校歌（歌詞）
   - 理不尽な校則
   - 奇妙な部活動（環境音付き）
   - 名物行事（写真付き）

## 🎨 大喜利の3つの法則

AIは以下の法則に基づいて学校を生成します：

1. **因果の暴走 (Hyperbole):**
   - 例: 「坂が多い」→「登校がアルピニストの訓練レベル」

2. **名物の義務化 (Obligation):**
   - 例: 「うどんが有名」→「蛇口から出汁が出る」

3. **歴史の誤用 (Misinterpretation):**
   - 例: 「忍者ゆかりの地」→「遅刻は変わり身の術で免除」

## 📁 プロジェクト構造

```
school-ogiri-app/
├── app/
│   ├── api/
│   │   ├── generate-school/    # 学校生成API（大喜利ロジック）
│   │   ├── generate-image/     # 画像生成API（DALL-E 3）
│   │   └── generate-audio/     # 音声生成API（Replicate）
│   ├── globals.css             # グローバルスタイル
│   ├── layout.tsx              # ルートレイアウト
│   └── page.tsx                # メインページ
├── components/
│   ├── MapSelector.tsx         # Google Maps コンポーネント
│   ├── LoadingScreen.tsx       # ローディング画面
│   └── SchoolWebsite.tsx       # 学校サイト表示
├── types/
│   └── school.ts               # TypeScript型定義
└── README.md
```

## 🚢 本番デプロイ

### Vercelへのデプロイ（推奨）

```bash
npm install -g vercel
vercel
```

環境変数は Vercel のダッシュボードから設定してください。

## ⚠️ 注意事項

- このアプリはAIが生成するフィクションのコンテンツです
- APIの使用には料金がかかる場合があります（特にDALL-E 3とReplicate）
- 生成には30秒〜1分程度かかります
- 不適切なコンテンツが生成された場合は、再生成してください

## 📝 ライセンス

MIT

## 🤝 貢献

プルリクエストを歓迎します！

## 📧 お問い合わせ

問題が発生した場合は、GitHubのIssuesでご報告ください。
