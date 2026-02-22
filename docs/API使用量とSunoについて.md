# API 使用量と Suno について

## Comet の「使用分布」に Suno が出ない理由

Comet の API 使用概要（使用分布）には、**チャット補完（Claude）** や **画像生成（Gemini Image）** のような「標準的な Comet API エンドポイント」の呼び出しだけが集計されます。

- **Suno** は Comet の **別枠の連携**（`/suno/generate` など）で提供されているため、**同じ「使用分布」の円グラフには含まれない**ことがあります。
- 請求や利用量は、Comet のダッシュボードの **別のタブ・別のページ**（例: Suno 用の利用量）で確認する必要がある場合があります。

つまり「Suno がここに表示されていない」のは、**未使用だからではなく、集計の区分が違う**可能性が高いです。Comet の料金・利用状況のページで Suno や「音楽生成」の項目を探してみてください。

## 画像生成の消費量を抑える

- デフォルトの画像モデルを **gemini-2.0-flash-exp-image-generation** にしています（消費量を抑えるため）。
- より画質を優先したい場合は、環境変数 **`COMET_IMAGE_MODEL`** に `gemini-2.5-flash-image` を指定してください。
- **Replicate**（`REPLICATE_API_TOKEN`）を設定すると、画像は Replicate 側で生成され、Comet の画像 API は使われません（コスト削減の選択肢になります）。

## 「出力が大きすぎる」で Inngest が失敗する場合

- Inngest のステップには **戻り値のサイズ制限（約 4MB）** があります。画像を **data URL（base64）** のまま Step2 の戻り値に含めると、7 枚で簡単に超えて **「出力が大きすぎる」** で失敗します。
- 対処：**Vercel Blob** を有効にし、環境変数 **`BLOB_READ_WRITE_TOKEN`** を設定してください。画像生成 API が data URL を返す場合、自動で Blob にアップロードし、**短い公開 URL だけ**を返すようにしています。これで Step 間で渡すデータが小さくなり、制限内に収まります。
- Vercel ダッシュボード → プロジェクト → **Storage** → **Create Database** で Blob を作成し、**Connect to Project** でプロジェクトに紐づけるとトークンが付与されます。
