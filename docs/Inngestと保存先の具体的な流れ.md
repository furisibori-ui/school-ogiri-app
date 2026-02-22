# Inngest と保存先（Vercel KV）の具体的な流れ

「学校生成」を Inngest に移すときの、**流れの割り振り**・**Vercel KV の作り方とコード**・**エラー時の確認の仕方**を具体的にまとめます。

---

## 1. いまの「学校生成」の流れを、Inngest の「イベント → 関数 → 保存」にどう割り振るか

### いまの流れ（コード上の動き）

```
[フロント] ピン選択
    ↓
[フロント] handleLocationSelect()
    ├─ POST /api/generate-school        (location)  ──→ 最大290秒（テキスト）
    └─ POST /api/generate-school-anthem (location)  ──→ 並列
            ↓ 校歌が返ったら
            POST /api/generate-audio (歌詞など)  ──→ バックグラウンド（待たない）
    ↓
[フロント] schoolResponse の JSON を受け取る → setSchoolData() → setStage('school')
    ↓
[フロント] 学校ページ表示。useEffect が発火
    ├─ 画像7枚: POST /api/generate-school-image を 7 本並列（Promise.allSettled）
    └─ 音声がまだなら: POST /api/generate-audio（1本）
    ↓
[フロント] 各レスポンスで setSchoolData を更新して表示を差し替え
```

- **長時間ブロックしているもの**: `generate-school` の 1 本（最大 290 秒）。
- **すでに非同期**: 画像・校歌音声は「ページ表示後」に別リクエストで取得。

---

### Inngest に移したあとの「割り振り」

| 役割 | いま | Inngest 移行後 |
|------|------|----------------|
| **トリガー** | フロントが `POST /api/generate-school` などを直接呼ぶ | フロントは「学校生成して」イベントを送るだけ。API は `inngest.send({ name: "school/generate", data: { location } })` を実行して **すぐ jobId を返す**（待たない）。 |
| **テキスト生成** | `/api/generate-school` と `/api/generate-school-anthem` のなか | Inngest 関数の **step.run の 1 つ目**。中身は今の `generate-school` と `generate-school-anthem` のロジックを呼ぶ（同じ API を内部で叩くか、関数に移植）。 |
| **画像7枚** | フロントの useEffect が `/api/generate-school-image` を 7 回 | Inngest 関数の **step.run の 2 つ目**。中で 7 本を `Promise.all` で並列に実行。 |
| **校歌音声** | 校歌返却後に `/api/generate-audio` を 1 回 | Inngest 関数の **step.run の 3 つ目**。1 回だけ呼ぶ。 |
| **結果の受け渡し** | レスポンスや setState でフロントが持つ | 全部終わったら **Vercel KV に保存**。キー例: `school:${jobId}`、値: 完成した学校データ（JSON）。 |
| **フロントの「完成」** | テキストが返った時点でページ表示し、画像・音声は後から | **jobId でポーリング**。`GET /api/job?jobId=xxx` が「完了」＋データを返したら、そのデータで setSchoolData してページ表示。 |

### イベントと関数の対応（名前の例）

- **送るイベント**: `school/generate`  
  - `data`: `{ jobId: string, location: LocationData }`
- **Inngest 関数**: このイベントを subscribe  
  - step1: テキスト生成（学校＋校歌歌詞）、校歌は school にマージ  
  - step2: 画像 7 枚を並列で生成し、school データの URL を更新  
  - step3: 校歌音声を 1 本生成し、`school_anthem.audio_url` を更新  
  - step4: 完成した `school` を Vercel KV に `school:${jobId}` で保存  

こうすると「イベント → 関数（複数 step）→ 保存」の割り振りがはっきりします。

---

## 2. Vercel KV の作成と、コードから使う部分

### 2-1. Vercel KV を「作る」（ダッシュボード）

1. Vercel ダッシュボードで **対象プロジェクト** を開く。
2. 上タブの **Storage** を開く。
3. **Create Database** → **KV** を選ぶ（Vercel KV は Upstash ベース）。
4. 名前（例: `school-ogiri-kv`）を付けて作成。
5. 作成後、**Connect to Project** で今のプロジェクトを選ぶ。
6. すると **環境変数** が自動でプロジェクトに追加される。例:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`（読取専用、必要なら）
7. 本番で使うなら **Production** にも同じ KV をリンク（または作成時に両方にリンク）。

これで「保存先」の準備は完了です。ローカルで使う場合は、これらの環境変数を `.env.local` にコピーします。

### 2-2. コードから使う（保存・取得のイメージ）

- **パッケージ**: `@vercel/kv` を使う場合  
  `npm install @vercel/kv`

- **保存する側（Inngest の最後の step など）**

```ts
import { kv } from '@vercel/kv'

// 完成した学校データを保存
await kv.set(`school:${jobId}`, JSON.stringify(schoolData))
// 完了フラグだけ別キーにしてもよい
await kv.set(`school:${jobId}:status`, 'completed')
```

- **読み出す側（フロントがポーリングで叩く API）**

```ts
// app/api/job/route.ts の GET など
import { kv } from '@vercel/kv'

const jobId = searchParams.get('jobId')
if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

const status = await kv.get(`school:${jobId}:status`)
if (status !== 'completed') {
  return NextResponse.json({ status: 'pending' }) // または running
}

const data = await kv.get(`school:${jobId}`)
if (typeof data === 'string') {
  return NextResponse.json({ status: 'completed', data: JSON.parse(data) })
}
return NextResponse.json({ status: 'completed', data })
```

- **有効期限を付ける（おすすめ）**  
  生成結果は 1 時間だけ残す、など:

```ts
await kv.set(`school:${jobId}`, JSON.stringify(schoolData), { ex: 3600 }) // 秒
await kv.set(`school:${jobId}:status`, 'completed', { ex: 3600 })
```

まとめると:

- **作成**: Vercel の Storage で KV を作り、プロジェクトにリンクして環境変数を通す。
- **コード**: `@vercel/kv` の `kv.set` / `kv.get` で `school:${jobId}` と `school:${jobId}:status` を書き・読みする。

---

## 3. エラーが出たときにログやドキュメントで原因を絞る

### 3-1. どこを確認するか

| 場所 | 何が分かるか |
|------|----------------|
| **ブラウザの開発者ツール（Console / Network）** | フロントのエラー、どの API が 4xx/5xx になったか、ポーリングの応答内容。 |
| **Vercel Dashboard → Project → Logs（または Deployments → 該当デプロイ → Logs）** | `/api/generate-school` や `/api/inngest`、`/api/job` などの **サーバー側の console.log / エラー**。 |
| **Inngest Dashboard（Cloud なら app.inngest.com）** | イベントが届いているか、関数が実行されたか、**どの step で失敗したか**、リトライ回数。 |

まず「フロントか / API か / Inngest か」を切り分けるとよいです。

### 3-2. よくあるパターンと原因の絞り方

- **「イベントを送ったのに Inngest で実行されない」**
  - Inngest の **Sync** が有効か（`/api/inngest/route.ts` を Inngest が叩けるか）。
  - Vercel の **環境変数** に `INNGEST_SIGNING_KEY` など必要な値が入っているか。
  - Inngest の **Event** 一覧で、該当イベントが届いているか確認。届いていなければ「送信側の API」のログを確認。

- **「Inngest のある step で失敗する」**
  - Inngest の Run 詳細で **失敗した step** と **エラーメッセージ** を開く。
  - その step が呼んでいる処理（テキスト生成・画像生成・音声生成・KV 保存）のどれで落ちているかを見る。
  - 該当処理の **Vercel の関数ログ**（その API が別途あるなら）や、Inngest の step の出力を見る。

- **「jobId でポーリングしてもずっと pending のまま」**
  - 最後の step（KV に保存する部分）まで成功しているか、Inngest で確認。
  - KV に本当に書けているか: Vercel の Storage の KV の中身を確認するか、`/api/job?jobId=xxx` の処理で `kv.get` の前後に `console.log` を入れて、Vercel の Logs で確認。

- **「KV に保存できない / 読めない」**
  - 環境変数 `KV_REST_API_URL` と `KV_REST_API_TOKEN` が、**その API を実行している環境**（Vercel のどの環境か、Inngest がどのサーバーから叩いているか）で設定されているか。
  - Inngest の関数は **Vercel の API 経由**で動くので、Vercel の環境変数が Inngest 実行時にも効いている。KV は「Vercel のプロジェクト」に紐付いているか確認。

### 3-3. ログの入れ方（原因を絞りやすくする）

- **イベント送信直後**  
  `console.log('Inngest event sent', { jobId, name: 'school/generate' })`

- **各 step の前後**  
  `console.log('step1 done', { jobId })` など。Inngest の step の戻り値にも必要な情報（例: 生成したテキストの有無）を含めると、Run 詳細で見やすい。

- **KV 保存の前後**  
  `console.log('saving to KV', jobId)` / `console.log('saved to KV', jobId)`  
  失敗時は `console.error('KV save failed', err)`。

- **ポーリング API**  
  `console.log('job status', { jobId, status })`  
  本番では減らしても、原因不明のときは一時的に増やすとよいです。

### 3-4. ドキュメントで確認するとよいところ

- **Inngest**: [Inngest Docs](https://www.inngest.com/docs) の「Events」「Step functions」「Retries」。
- **Vercel KV**: [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv) の制限・環境変数・`@vercel/kv` の使い方。
- **Vercel の関数ログ**: Dashboard の Logs の見方と、実行環境（Edge/Node）の違い（KV はどちらでも使えるが、パッケージが違う場合は要確認）。

---

## まとめ

1. **割り振り**: トリガーは「イベント送信＋即 jobId 返却」、重い処理はすべて Inngest の 1 関数の複数 step（テキスト → 画像7枚並列 → 音声 → KV 保存）、フロントは jobId でポーリングして「完了＋データ」を受け取って表示。
2. **Vercel KV**: Storage で KV を作成しプロジェクトにリンク → 環境変数が付く → コードでは `@vercel/kv` で `school:${jobId}` と `school:${jobId}:status` を set/get。
3. **エラー**: ブラウザ・Vercel Logs・Inngest Dashboard の 3 つで「どこで止まったか」を切り分け、KV の書き込み失敗なら環境変数とキー名・有効期限を確認する。

この 3 点を押さえておくと、Inngest 導入時と運用時の見通しが立ちやすくなります。
