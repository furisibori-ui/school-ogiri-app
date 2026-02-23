# CometAPI Suno 音楽生成 API 仕様書

## 1. 概要
CometAPIを経由してSunoの音楽生成（校歌生成）を非同期（タスク受付 → ポーリング）で行う仕様です。
Vercelのタイムアウトを防ぐため、Inngestのバックグラウンドジョブ内でこの処理を完結させます。

## 2. エンドポイント仕様
### ① 生成タスクの送信 (Submit)
- **Method:** `POST`
- **URL:** `https://api.cometapi.com/suno/submit/music`
- **Headers:**
  - `Authorization: Bearer <COMETAPI_KEY>`
  - `Content-Type: application/json`
- **Body:** `{ "prompt": "...", "make_instrumental": false, "mv": "chirp-v4" }` など必要なパラメータ
- **Responseの期待値:** リクエスト成功時、レスポンスからタスクIDを取得する。Comet の実レスポンスは `{ "code": "success", "message": "", "data": "UUID文字列" }` の形で、**`data` がタスクIDの文字列**になっていることがある。`res.task_id` / `res.data`（string のとき）/ `res.data.task_id` などを柔軟に取得すること。

### ② タスクステータスの照会 (Fetch/Polling)
- **Method:** `GET`
- **URL:** `https://api.cometapi.com/suno/fetch?task_id={task_id}`
  - ※もし上記で404等になる場合は、パスパラメータ形式 `https://api.cometapi.com/suno/fetch/{task_id}` にフォールバックするロジックを考慮すること。
- **Headers:** Submit時と同じ
- **Responseの期待値:**
  - 処理中の場合: statusフィールドが `pending` や `running` 等。
  - 完了の場合: statusフィールドが `complete`（または `SUCCESS`）になる。
  - 音声URL: 完了時、レスポンス内から音声ファイルのURLを取得する。（※ `audio_url`, `stream_url`, `url` などのフィールド名になる可能性があるため、オプショナルチェーン等で防御的に取得すること）

## 3. 実装上の必須要件 (Inngest関数内)
1. **ポーリングの実装:**
   Submitで取得した `task_id` を使い、`while` ループ等を用いて数秒（例: 5〜10秒）おきにFetchエンドポイントを叩くこと。
2. **無限ループ防止:**
   ポーリングには最大試行回数またはタイムアウト時間（例: 最大5分）を設け、超過した場合はエラーとして処理すること。
3. **デバッグログの出力:**
   原因の切り分けを容易にするため、Submitの直後と、Fetchでステータスが変わったタイミング、および最終的な音声URL取得時に、それぞれの生のレスポンスデータを `console.log` で出力すること。
