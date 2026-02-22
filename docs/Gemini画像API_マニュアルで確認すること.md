# Gemini（Comet経由）画像生成 API — マニュアルで調べてほしいこと

Suno と同様に、**画像生成でも「1回呼んで画像が返る」想定で実装しているが、実際の API が非同期（タスク受付 → ポーリング）だったり、エンドポイントが違う可能性**があります。  
以下の項目を **Gemini の公式ドキュメント** および **CometAPI の画像生成ドキュメント** で調べ、結果をメモしておくと実装の修正ができます。

---

## 1. 使うべきエンドポイントはどれか

**現在の実装で使っている URL：**
- `POST https://api.cometapi.com/v1beta/models/{モデルID}:generateContent`
- 例: `https://api.cometapi.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent`

**調べてほしいこと：**
- 画像生成の**正しいリクエスト先（エンドポイント URL）**は上記でよいか。
- もし違う場合、**正しい URL** は何か（例: `/v1beta/.../generateImage` や `/image/submit` など別パスになっていないか）。
- CometAPI のドキュメントに「画像生成」専用のエンドポイントの記載があるか。

---

## 2. 同期か非同期（2ステップ）か

**現在の想定：** 1回の POST で、レスポンスの JSON の中に **base64 の画像データ**（`candidates[0].content.parts[].inlineData.data`）がそのまま返ってくる（同期）。

**調べてほしいこと：**
- 画像生成は **同期**（1回のリクエストで画像データがそのまま返る）か、  
  それとも **非同期**（Suno のように「タスク送信 → task_id が返る → 別エンドポイントでポーリングして画像 or URL を取得」）か。
- 非同期の場合：
  - **タスク送信（submit）用の URL** と **メソッド・リクエスト body** の形式。
  - **タスク照会（結果取得・ポーリング）用の URL** と、`task_id` の渡し方（クエリ or パス or body）。
  - 完了時のレスポンスで **画像をどう取得するか**（base64 が返る / 画像の URL が返る / 別ダウンロード用 URL がある 等）。

---

## 3. リクエスト body の形式

**現在の実装で送っている body の例：**
```json
{
  "contents": [{ "role": "user", "parts": [{ "text": "プロンプト文" }] }],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": { "aspectRatio": "16:9", "imageSize": "1K" }
  }
}
```

**調べてほしいこと：**
- 上記の形式は **Gemini 画像生成の公式仕様と一致しているか**。
- **必須パラメータ** と **任意パラメータ** の一覧（`responseModalities` / `imageConfig` / `aspectRatio` / `imageSize` など）。
- CometAPI 経由の場合、**追加で必要なヘッダーやパラメータ**（例: `model` を body に入れる等）がないか。
- **利用可能なモデル ID** の一覧（例: `gemini-2.0-flash-exp-image-generation`, `gemini-2.5-flash-image` など）。Comet の料金ページや API ドキュメントに記載があるか。

---

## 4. レスポンスの形式（成功時・エラー時）

**現在の実装で期待している形：**
- 成功時: JSON の `candidates[0].content.parts[]` のうち、`inlineData` を持つ要素から `mimeType` と `data`（base64）を取得。
- エラー時: `res.ok` が false、または HTML が返る（その場合はプレースホルダー画像にフォールバック）。

**調べてほしいこと：**
- 成功時に **画像データは本当に `candidates[0].content.parts[].inlineData` に base64 で入るか**。  
  別のフィールド（例: `imageUrl` / `url` / `outputUri`）で返る仕様になっていないか。
- **非同期の場合は完了時のレスポンス構造**（どこに画像 URL や base64 が入るか）。
- **エラー時のレスポンス**（HTTP ステータス、JSON のエラーコード、Comet が HTML のエラーページを返す条件など）。

---

## 5. タイムアウト・制限

**調べてほしいこと：**
- 画像生成の **推奨または最大の待ち時間（タイムアウト）**。
- **レート制限**（1分あたりのリクエスト数など）の有無と目安。
- 非同期の場合、**ポーリング間隔の推奨値** と **最大待機時間** の目安。

---

## 6. まとめ：実装側で知りたい「Yes/No」と値

**✅ マニュアル確認済み（結果を下表に反映）**

| # | 質問 | 答（マニュアルで確認した結果） |
|---|------|--------------------------------------|
| 1 | 画像生成の正しいエンドポイント URL は `.../models/{id}:generateContent` でよいか？ | **Yes.** Google 公式仕様と同じ URL 構造で問題ありません。 |
| 2 | 画像生成は「1回のリクエストで画像が返る」同期 API か？ | **Yes.** ポーリングは不要で、1回の通信でそのまま画像が返ります。 |
| 3 | 非同期の場合、タスク送信（submit）の URL と、結果取得（ポーリング）の URL は？ | **不要**（同期のため）。 |
| 4 | リクエスト body の `contents` / `generationConfig` / `responseModalities` / `imageConfig` は公式どおりか？ | **Yes.** 現在のペイロードで問題なく動作します。 |
| 5 | 成功時、画像は `candidates[0].content.parts[].inlineData` で取得してよいか？ | **Yes.** その中の `.data` に base64 文字列として格納されています。 |
| 6 | 利用可能な画像生成モデル ID の一覧（Comet で使えるもの）は？ | `gemini-2.5-flash-image`（最新モデル「Nano Banana」）、`gemini-2.0-flash-exp-image-generation` など。 |

---

**結論:** 画像生成は **同期 API** で、現在のエンドポイント・リクエスト形式・レスポンスの取り方で正しいです。Suno のような 2 ステップ（submit → ポーリング）への変更は不要です。

---

## それでも画像が出ないときの切り分け

仕様は正しいのに画像が出ない場合、次のどれかで**静かにプレースホルダーに置き換わっている**可能性があります。

| 原因 | ログで見るキーワード | 対処 |
|------|------------------------|------|
| Comet が HTML を返している（認証エラー・未契約・エンドポイント不一致） | `Comet image API returned HTML instead of JSON` | `Comet_API_確認手順.md` の 1〜3（API キー・画像 API 利用可否・モデル ID）を確認 |
| HTTP エラー（4xx/5xx） | `Comet image API non-OK:` のあとにステータスコード | 同じく Comet ダッシュボードでエラー内容・レート制限を確認 |
| レスポンスが JSON ではない | `Comet image API response not JSON` | 上記と同様、Comet 側の返却形式を確認 |
| **200 OK だが画像が含まれていない**（安全フィルタでブロック・空の candidates 等） | `[Comet image] 200 OK but no image in response` | ログの `finishReason` や `rawCandidatesKeys` を確認。プロンプトの内容がブロックされていないか、別モデル（例: `COMET_IMAGE_MODEL=gemini-2.5-flash-image`）を試す |

**確認手順:** Vercel の Logs で上記キーワードを検索し、画像生成が走った時刻のログを確認する。`[Comet image] 200 OK but no image` が出ていれば、API は通っているが画像が返っていない状態です。
