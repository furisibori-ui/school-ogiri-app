# API 使用量と Suno について

## テキスト・画像が「テンプレっぽい」「毎回似た内容」になる場合

- **原因**: 学校テキスト生成（Claude 経由）が失敗し、**モック（フォールバック）データ**が返っているためです。画像はそのモック内容で生成されるため、パターンが似ます。
- **対処**:
  1. **Comet のチャットモデル**: エラーに「指定したモデルのチャネルが利用できません」と出る場合、**Vercel の環境変数**を確認します。`.env.local` はローカル専用なので、本番は **Vercel ダッシュボード → プロジェクト → Settings → 環境変数** で設定します。
  2. **`COMET_CHAT_MODEL` がもともとない場合**: コードはデフォルトで `anthropic/claude-3-5-haiku` → 失敗時のみ `anthropic/claude-3-5-sonnet` を試します。両方「チャネルが利用できません」なら、**Comet の契約・プランでそのモデルが使えない**可能性があります。そのときは下記「Comet チャットモデル設定の概要」のとおり、**利用可能なモデルID を確認してから、Vercel に `COMET_CHAT_MODEL` を「追加」**してください（他の環境変数と同じように、キーと値を登録するだけです）。
  3. **一度だけ成功したことがある**: Comet 側のチャネル空きや負荷で、同じモデルが「使えるとき」と「使えないとき」がある場合があります。安定させたい場合は、Comet のモデルカタログで **自分のプランで確実に使えるモデルID** を選び、`COMET_CHAT_MODEL` にその ID を設定するのがおすすめです。

---

## Comet チャットモデル設定の概要（COMET_CHAT_MODEL）

- **登録場所**: **Vercel** の環境変数（ローカルだけの `.env.local` ではなく、本番用は Vercel の「環境変数」に追加）。画像で見ている「環境変数」一覧に、**新規でキー `COMET_CHAT_MODEL`、値にモデルID** を追加すればOKです。
- **利用可能なモデルIDの確認**:
  - Comet の **モデルカタログ**: [https://www.cometapi.com/ja/models/](https://www.cometapi.com/ja/models/) で 500 以上のモデルと **モデルID** を確認できます。
  - ダッシュボード: [https://www.cometapi.com/console/token](https://www.cometapi.com/console/token) で API キー・使用状況を管理。
  - ドキュメント: [https://apidoc.cometapi.com/](https://apidoc.cometapi.com/) でエンドポイントやモデル名を確認可能。
- **モデルIDの例**（Comet の仕様により表記が異なる場合があります）:
  - Claude 系: `anthropic/claude-3-5-haiku` / `anthropic/claude-3-5-sonnet` のほか、`claude-sonnet-4-5-20250929` などバージョン付きの形式もあることがあります。**実際に使う値はモデルカタログまたは料金ページの表記に合わせてください。**
  - 契約によっては「Haiku は使えるが Sonnet は使えない」などチャネルが限られることがあり、その場合は **カタログで利用可能と書いてあるモデルID** を `COMET_CHAT_MODEL` に設定します。
- **まとめ**: 「no available channel」「model_not_found」が出たら、Comet のモデルカタログで **自分のプランで利用可能なモデルID** を確認し、その ID を Vercel の環境変数 **`COMET_CHAT_MODEL`** に追加（キー・値とも画像の他の変数と同じように登録）すれば、その 1 本で学校生成が動くようになります。

## 1回の「学校生成」でどれくらい消費するか

- Comet ダッシュボードの **「使用ログ」（Usage Log）** で、リクエストごとの使用量・コストを確認できます。
- 使用分布グラフでは **モデル別**（例: claude-3-5-sonnet, gemini-2.5-flash-image, chirp-bluejay）の利用量が見えます。1回の学校生成では、テキスト（Claude）、画像7枚（Gemini Image）、校歌（Suno/chirp）がそれぞれ呼ばれるため、グラフの該当モデルの増分でおおよその消費が分かります。
- 正確な「1回あたりの金額」は Comet の料金表と使用ログのリクエスト数から計算してください。

## Comet の「使用分布」に Suno が出ない理由

Comet の API 使用概要（使用分布）には、**チャット補完（Claude）** や **画像生成（Gemini Image）** のような「標準的な Comet API エンドポイント」の呼び出しだけが集計されます。

- **Suno** は Comet の **別枠の連携**（`/suno/generate` など）で提供されているため、**同じ「使用分布」の円グラフには含まれない**ことがあります。
- 請求や利用量は、Comet のダッシュボードの **別のタブ・別のページ**（例: Suno 用の利用量）で確認する必要がある場合があります。

つまり「Suno がここに表示されていない」のは、**未使用だからではなく、集計の区分が違う**可能性が高いです。Comet の料金・利用状況のページで Suno や「音楽生成」の項目を探してみてください。

## 校歌（Suno）が生成されない・「no audio URL」・ポーリングタイムアウト

- **step3: no audio URL** / **Suno ポーリングタイムアウト**: 校歌生成は「タスク送信 → 照会を最大60秒ポーリング」で行っています。Suno 側の混雑や遅延で 60 秒以内に完了しないと、音声 URL が取れず校歌が出ません。
- **対処**: 時間をおいて再度「学校生成」を試す。Comet の Suno fetch API が **日本語キー**（`データ`・`ステータス`）で返す場合にも対応済みなので、完了していれば URL は取得できるようになっています。
- ログに `[Suno Fetch] status changed` で `IN_PROGRESS` のまま 60 秒で打ち切られる場合は、Suno の処理が遅いだけなので再試行で成功することがあります。

## 画像生成のモデル

- デフォルトは **gemini-2.5-flash-image**（Comet で利用可能なモデル）。環境変数 **`COMET_IMAGE_MODEL`** で上書きできます。
- **Replicate**（`REPLICATE_API_TOKEN`）を設定すると、画像は Replicate 側で生成され、Comet の画像 API は使われません（コスト削減の選択肢になります）。

## 「出力が大きすぎる」で Inngest が失敗する場合

- Inngest のステップには **戻り値のサイズ制限（約 4MB）** があります。画像を **data URL（base64）** のまま Step2 の戻り値に含めると、7 枚で簡単に超えて **「出力が大きすぎる」** で失敗します。
- 対処：**Vercel Blob** を有効にし、環境変数 **`BLOB_READ_WRITE_TOKEN`** を設定してください。画像生成 API が data URL を返す場合、自動で Blob にアップロードし、**短い公開 URL だけ**を返すようにしています。これで Step 間で渡すデータが小さくなり、制限内に収まります。
- Vercel ダッシュボード → プロジェクト → **Storage** → **Create Database** で Blob を作成し、**Connect to Project** でプロジェクトに紐づけるとトークンが付与されます。
