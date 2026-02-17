# セットアップガイド

## 🚀 クイックスタート

このガイドに従って、プロジェクトをセットアップしてください。

## ステップ1: Node.jsのインストール

### macOSの場合

ターミナルを開いて以下のコマンドを実行：

```bash
# Homebrewをインストール
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.jsをインストール
brew install node

# インストール確認
node --version
npm --version
```

### Windowsの場合

[Node.js公式サイト](https://nodejs.org/)から最新のLTS版をダウンロードしてインストールしてください。

## ステップ2: 依存関係のインストール

プロジェクトディレクトリで以下を実行：

```bash
npm install
```

## ステップ3: APIキーの設定

### 3-1. Google Maps API キーの取得

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. 左メニューから「APIとサービス」→「ライブラリ」を選択
4. 以下のAPIを検索して有効化：
   - **Maps JavaScript API**
   - **Geocoding API**
   - **Places API**
5. 左メニューから「APIとサービス」→「認証情報」を選択
6. 「認証情報を作成」→「APIキー」をクリック
7. 生成されたAPIキーをコピー

### 3-2. Anthropic API キーの取得

1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. アカウントを作成（メールアドレスで登録）
3. ダッシュボードから「API Keys」を選択
4. 「Create Key」をクリック
5. 生成されたAPIキーをコピー

### 3-3. OpenAI API キーの取得

1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. アカウントを作成（メールアドレスまたはGoogleアカウントで登録）
3. 右上のプロフィールアイコン→「API keys」を選択
4. 「Create new secret key」をクリック
5. 生成されたAPIキーをコピー（**一度しか表示されないので注意**）

### 3-4. Replicate API トークンの取得

1. [Replicate](https://replicate.com/) にアクセス
2. GitHubアカウントでサインイン
3. 右上のプロフィールアイコン→「Account」を選択
4. 「API tokens」セクションからトークンをコピー

### 3-5. 環境変数ファイルに設定

プロジェクトのルートディレクトリにある `.env.local` ファイルを開いて、取得したAPIキーを貼り付けてください：

```env
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=あなたのAPIキー

# AI API Keys
ANTHROPIC_API_KEY=あなたのAPIキー

# Image Generation (DALL-E 3)
OPENAI_API_KEY=あなたのAPIキー

# Audio Generation (Replicate)
REPLICATE_API_TOKEN=あなたのトークン
```

## ステップ4: 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## ✅ 動作確認

1. ブラウザで地図が表示されることを確認
2. 地図上の任意の場所をクリック
3. ローディング画面が表示され、30秒〜1分後に学校サイトが生成されることを確認

## ❓ トラブルシューティング

### 「地図が読み込めません」エラー

- `.env.local` ファイルの `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` が正しく設定されているか確認
- Google Cloud Console で Maps JavaScript API が有効化されているか確認

### 「学校の生成に失敗しました」エラー

- `.env.local` ファイルの `ANTHROPIC_API_KEY` が正しく設定されているか確認
- Anthropic のアカウントにクレジットがあるか確認

### 画像が生成されない

- `.env.local` ファイルの `OPENAI_API_KEY` が正しく設定されているか確認
- OpenAI のアカウントにクレジットがあるか確認

### 音声が生成されない

- `.env.local` ファイルの `REPLICATE_API_TOKEN` が正しく設定されているか確認
- Replicate のアカウントにクレジットがあるか確認

## 💰 料金について

- **Google Maps API:** 月$200の無料枠あり
- **Anthropic Claude:** 使用量に応じた従量課金
- **OpenAI DALL-E 3:** 画像1枚あたり約$0.04
- **Replicate:** モデルごとに異なる料金体系

開発中はAPI使用量に注意してください。

## 🎉 完了！

セットアップが完了しました。楽しんでください！
