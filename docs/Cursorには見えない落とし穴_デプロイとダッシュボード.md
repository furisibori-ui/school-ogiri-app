# Cursorには見えない落とし穴 — デプロイ・ダッシュボードまわり

Cursor（AIエディタ）は**コードの文法やロジック**は見ますが、**本番環境のダッシュボード**や**外部サービスの設定・制限**までは見に行けません。  
「ローカルでは完璧なのに本番で動かない」というとき、以下を疑うと無駄な悩み時間をかなり減らせます。

---

## 1. Inngest の「Sync（同期）忘れ」

| 項目 | 内容 |
|------|------|
| **症状** | 画面でピンを挿しても、Inngest 側で処理が始まらない（Runs の履歴にすら残らない）。 |
| **原因** | Vercel に新しいコードをデプロイしたあと、Inngest に「新しい関数を追加した」と知らせる **Sync（同期）** をしていない。 |
| **確認場所** | [Inngest Dashboard](https://app.inngest.com/) の **Apps** タブで、Vercel の URL が正しく連携されているか確認。必要なら手動で **Sync** を実行。 |

### Inngest Sync をどう確認したらいい？

1. **Inngest にログインする**  
   [https://app.inngest.com](https://app.inngest.com) を開き、自分のアカウントでログインする。

2. **左メニューから「Apps」を開く**  
   「Apps」タブ（または「Manage」→「Apps」）をクリックし、登録されているアプリの一覧を表示する。

3. **Vercel 用のアプリがあるか・URL が本番か確認する**
   - 一覧に「このプロジェクト用」のアプリ（名前は任意）があるか見る。
   - そのアプリを開き、**App URL**（または Sync 用 URL）が **本番の Vercel URL** になっているか確認する。
   - 例: `https://あなたのプロジェクト.vercel.app`（**末尾に `/api/inngest` は付けない**）。

4. **「Sync」を実行する**
   - アプリの画面に **「Sync」** または **「Sync your app」** のようなボタンがあればクリックする。
   - デプロイ直後や、Inngest の関数（`school-generate` など）を追加・変更したあとは、ここで一度 Sync すると、Inngest が最新の関数一覧を取得する。

5. **Sync が成功しているか見る**
   - Sync 後に「Synced」や「Last synced: 日時」のように表示されていれば成功。
   - **「URLにアクセスできませんでした」** と出る場合は:
     - ブラウザで `https://あなたのドメイン.vercel.app/api/inngest` を開き、JSON が返るか確認する（返ればエンドポイントは動いている）。
     - **Vercel の「展開保護」** を確認する。Vercel → プロジェクト → **Settings** → **Deployment Protection**。**Vercel 認証**がオンだと Inngest がアクセスできず Sync に失敗する。本番を Public にするか、「保護バイパス」で Inngest 用のシークレットを設定する（詳しくは [Inngestと保存先の具体的な流れ.md](./Inngestと保存先の具体的な流れ.md) の「Sync で『URLにアクセスできませんでした』が出る」を参照）。

6. **関数が登録されているか確認する**
   - Inngest の **「Functions」** タブ（または Apps 内の「Functions」）を開く。
   - `school-generate` など、このアプリで使っている関数名が一覧に出ていれば、Sync で正しく取り込まれている。

**まとめ:** デプロイしたあと「画面でピンを挿したのに Runs に何も出ない」ときは、**Apps → 該当アプリ → Sync を押す**と直ることが多い。

- 詳細な Inngest の流れは [Inngest導入の手順.md](./Inngest導入の手順.md) / [Inngestと保存先の具体的な流れ.md](./Inngestと保存先の具体的な流れ.md) を参照。

---

## 2. Vercel の環境変数が「Production（本番）」に入っていない

| 項目 | 内容 |
|------|------|
| **症状** | ローカル（`npm run dev`）では動くのに、Vercel にデプロイした途端に画像や校歌が作れなくなる。 |
| **原因** | 環境変数登録時に **Production** のチェックが外れており、本番ではキーが空になっている。 |
| **確認場所** | Vercel ダッシュボード → **Settings** → **Environment Variables**。各キーが **Production**（および必要なら Preview）に適用されているか確認。 |

- API キー・契約の確認は [Comet_API_確認手順.md](./Comet_API_確認手順.md) を参照。
- 環境変数を変えたら **再デプロイ** が必要（デプロイ時に取り込まれるため）。

---

## 3. FUNCTION_INVOCATION_TIMEOUT（関数の実行時間切れ）

| 項目 | 内容 |
|------|------|
| **症状** | デプロイや「学校生成」実行中に **FUNCTION_INVOCATION_TIMEOUT**（504）が出る。 |
| **原因** | Vercel のサーバーレス関数には実行時間の上限がある（デフォルトはプランにより 10〜15 秒など）。Inngest が `/api/inngest` を呼ぶと Step1 で最大約 290 秒かかるため、**`/api/inngest` に `maxDuration` を付けていない**とすぐ時間切れになる。 |
| **対策** | `app/api/inngest/route.ts` に `export const maxDuration = 300` を追加する。あわせて `vercel.json` の `functions` に、長時間動くルート（`generate-school` / `generate-school-image` / `generate-audio` / `generate-school-anthem` / **inngest**）をすべて列挙し `maxDuration: 300` を指定する。 |

- 本アプリでは上記を設定済み。今後「学校生成」用に別の API を追加した場合は、そのルートにも `maxDuration` と `vercel.json` の追記が必要。
- プランによっては 300 秒より短い上限のことがある。その場合は [290秒タイムアウト_どうするか.md](./290秒タイムアウト_どうするか.md) の「テキストを軽くする」などで処理時間を短くする。

**Inngest の画面に「An error occurred with your deployment / FUNCTION_INVOCATION_TIMEOUT」と出る場合**  
→ その Run は **Vercel 側で 300 秒時間切れになった**ことを示しています。**最新のデプロイ**（`maxDuration` 付きの inngest ルート ＋ Step1=240s・Step3 ポーリング=24s の修正）が Vercel に反映されているか確認してください。反映後は「学校生成」を**あらためて実行**すると、300 秒以内に完了するようになります。古い Run のエラーメッセージは残るため、**新しい Run で再試行**して確認してください。

---

## 4. 画像サイズが大きすぎる（Base64・KV の制限）

| 項目 | 内容 |
|------|------|
| **症状** | Inngest のステップ間や Vercel KV 保存時に **Payload Too Large** や **Quota Exceeded** で落ちる。 |
| **原因** | Gemini が返す画像（Base64）は 1 枚あたり数 MB になりがち。7 枚で 10〜20 MB になると、**Inngest のステップ間のペイロード制限**や **Vercel KV の 1 キーあたりのサイズ制限**を超える。 |
| **対策** | Base64 のまま KV に保存せず、**Vercel Blob や Supabase Storage などに画像をアップロードし、取得した URL だけを KV に保存**する設計にする。 |

- このアプリでは `generate-school-image` で data URL を **Vercel Blob** にアップロードして URL を返すようにしているため、KV に保存するのは URL のみ。それでもエラーが出る場合は、Blob の未使用やステップ間のデータ量を確認する。

---

## 5. AI のセーフティフィルターによる「空っぽ」レスポンス

| 項目 | 内容 |
|------|------|
| **症状** | `candidates[0].content.parts[0].inlineData.data` を参照したときに **TypeError: Cannot read properties of undefined** で落ちる。または 200 OK なのに画像が返ってこない。 |
| **原因** | プロンプトが安全フィルターに引っかかり、Gemini が画像を返さず別の形のレスポンス（ブロック理由のみ）を返している。Cursor は「常に成功する前提」でコードを書きがち。 |
| **対策** | 画像が無い場合に **candidates や parts の存在をチェック**してから `inlineData` にアクセスする。ブロック理由の確認は `finishReason` / `safetyRatings` / `promptFeedback` をログ出力する（[Gemini画像API_マニュアルで確認すること.md](./Gemini画像API_マニュアルで確認すること.md) の「セーフティフィルター」の節を参照）。 |

---

## 6. Vercel の「Edge ランタイム」非対応パッケージ

| 項目 | 内容 |
|------|------|
| **症状** | デプロイ時のビルドは通るが、API を叩いた瞬間に **500 Internal Server Error** になる。 |
| **原因** | API に `export const runtime = 'edge'` が指定されている一方で、使用しているライブラリ（一部の画像処理・Node 専用モジュールなど）が **Edge 環境非対応**。 |
| **対策** | 該当 API から `runtime = 'edge'` を外す（Node ランタイムにする）、または Edge 対応の別ライブラリに差し替える。 |

---

## まとめ

| # | 落とし穴 | まず確認する場所 |
|---|----------|------------------|
| 1 | Inngest Sync 忘れ | Inngest ダッシュボード → Apps → Sync |
| 2 | 環境変数が Production に入っていない | Vercel → Settings → Environment Variables |
| 3 | **FUNCTION_INVOCATION_TIMEOUT**（関数が時間切れ） | `/api/inngest` と各 API に `maxDuration: 300` が付いているか。`vercel.json` の `functions` に長い処理をするルートが含まれているか |
| 4 | 画像 Base64 で KV/ステップが爆発 | 画像は Blob 等に上げて URL だけ保存（当アプリは対応済み） |
| 5 | セーフティフィルターで画像が空 | ログの `finishReason` / `imageType` を確認。undefined チェックを入れる |
| 6 | Edge 非対応パッケージ | `runtime = 'edge'` の有無と使用ライブラリの互換性 |

「ローカルは動くのに本番だけおかしい」ときは、**コードではなくダッシュボード（Inngest・Vercel・Comet）の設定と制限**を疑うと原因に早くたどり着けます。
