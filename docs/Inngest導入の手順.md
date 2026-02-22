# Inngest 導入の手順（やること一覧）

学校生成をバックグラウンドジョブ化するために、**あなたがやること**を 1 から順に書きます。

---

## 1. 依存関係を入れる

プロジェクトのルートで:

```bash
npm install
```

これで `inngest` と `@vercel/kv` が入ります（すでに `package.json` には追加済み）。

---

## 2. Vercel KV を作る（保存先）

1. **Vercel ダッシュボード**を開く → このプロジェクト（school-ogiri-app）を選択。
2. 上タブの **Storage** を開く。
3. **Create Database** → **KV** を選ぶ。
4. 名前を付ける（例: `school-ogiri-kv`）→ 作成。
5. 作成後、**Connect to Project** で今のプロジェクトを選ぶ。
6. すると次の環境変数が**自動で**プロジェクトに追加されます:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - （読取専用用の）`KV_REST_API_READ_ONLY_TOKEN` があればそれも

**ローカルで動かす場合**:  
Vercel の Storage 画面で該当 KV を開き、**`.env.local` 用の値**をコピーして、プロジェクト直下の `.env.local` に貼る。

```env
KV_REST_API_URL=https://xxxxx.upstash.io
KV_REST_API_TOKEN=AXxxxx...
```

本番（Vercel）にデプロイするだけなら、上記「Connect to Project」だけで本番用の環境変数は付きます。

---

## 3. Inngest を用意する（Cloud を使う場合）

Inngest Cloud でジョブを動かす場合:

1. **https://app.inngest.com** にアクセスし、アカウント作成 or ログイン。
2. **Create App**（または既存アプリ）で「Sync」の設定をする。
3. **App URL** に、あなたのアプリの URL を入れる:
   - ローカル: `http://localhost:3000` など（後述の Inngest Dev Server を使う場合は別）
   - 本番: `https://あなたのドメイン.vercel.app`
4. Inngest の画面で **Signing Key** と **Event Key** が表示されるのでコピー。
5. **Vercel** のプロジェクト → **Settings** → **Environment Variables** で次を追加:
   - `INNGEST_SIGNING_KEY` = コピーした Signing Key（本番・プレビュー用）
   - `INNGEST_EVENT_KEY` = コピーした Event Key（イベント送信用。任意だが推奨）

**ローカルで試すだけ**なら、後述の「Inngest Dev Server」を使えば、最初は Signing Key がなくても動かせます。

---

## 4. ローカルで動かす（開発時）

1. **Vercel KV の環境変数**を `.env.local` に置く（上記 2）。
2. 次のコマンドでアプリを起動:

   ```bash
   npm run dev
   ```

3. **Inngest の開発用 UI を使う場合**  
   別ターミナルで Inngest Dev Server を立てる:

   ```bash
   npx inngest-cli@latest dev
   ```

   ブラウザで `http://localhost:8288` を開くと、イベントや関数の実行状況が見られます。

4. フロントから「学校生成」を実行するときは、**新しいフロー**では:
   - `POST /api/school/generate-job` に location を送る
   - 返ってきた `jobId` で `GET /api/job?jobId=xxx` をポーリングする  

   という形にフロントを変更する必要があります（まだ変更していなければ、次の 5 で対応）。

---

## 5. フロントを「ジョブ＋ポーリング」に切り替える

いまフロントは `POST /api/generate-school` を直接叩いて、レスポンスを待っていると思います。

バックグラウンドジョブにするには、次のように切り替えます。

1. **ピン選択で「学校生成」を開始するとき**
   - 今: `POST /api/generate-school` に `location` を送って、返ってきた JSON を `setSchoolData` に渡す。
   - 変更後:
     - `POST /api/school/generate-job` に `location` を送る。
     - レスポンスの `{ jobId }` を受け取る。
     - `jobId` を保存し、ローディング表示（「学校を生成しています…」など）を出す。

2. **完了を待つ**
   - 一定間隔（例: 2〜3 秒ごと）で `GET /api/job?jobId=xxx` を呼ぶ（ポーリング）。
   - レスポンスの `status` が `completed` かつ `data` が入っていたら:
     - `setSchoolData(data)` で学校データをセットし、学校ページ（`stage: 'school'`）に進む。
   - `status` が `pending` または `running` の間は、そのままポーリングを続ける。

3. **エラー**
   - ジョブ開始時: `POST /api/school/generate-job` が 4xx/5xx なら「ジョブの開始に失敗しました」等を表示。
   - ポーリング: 長時間 `completed` にならない場合は「しばらく経ってから再度お試しください」等で打ち切ってよいです。

（フロントの該当箇所を具体的に書き換える例が必要なら、`app/page.tsx` の `handleLocationSelect` 周りを教えてもらえれば、そのコード例も書けます。）

---

## 6. 本番デプロイ（Vercel）するとき

1. **Vercel** にこのリポジトリをデプロイする。
2. **Storage** で作った KV を、そのプロジェクトに **Connect to Project** 済みであることを確認（手順 2）。
3. **Inngest Cloud** を使う場合は、Vercel の環境変数に `INNGEST_SIGNING_KEY` と（任意）`INNGEST_EVENT_KEY` を設定（手順 3）。
4. Inngest の **App URL** を、本番の URL（例: `https://xxx.vercel.app`）に設定する。
5. フロントが「generate-job → ポーリング」になっていれば、本番でも同じ流れで動きます。

---

## 7. 動作確認のポイント

- **Inngest にイベントが届いているか**: Inngest ダッシュボード（Cloud または Dev Server の UI）の「Events」で `school/generate` が来ているか。
- **関数が実行されているか**: 同じダッシュボードの「Runs」で `school-generate` が実行され、各 step が成功しているか。
- **KV に保存されているか**: 完了後、`GET /api/job?jobId=xxx` で `status: 'completed'` と `data` が返るか。
- **ログ**: Vercel の **Logs** や Inngest の Run 詳細で、`step1 done` や `saved to KV` などのログが出ているか。

---

## まとめチェックリスト

- [ ] `npm install` した
- [ ] Vercel Storage で KV を作り、プロジェクトに Connect した
- [ ] ローカルなら `.env.local` に `KV_REST_API_URL` / `KV_REST_API_TOKEN` を入れた
- [ ] Inngest Cloud を使うなら、Vercel に `INNGEST_SIGNING_KEY` を設定した
- [ ] フロントを「generate-job → jobId → ポーリング /api/job」に切り替えた（またはこれから切り替える）
- [ ] ローカルで `npm run dev` して、ピン選択 → ジョブ開始 → ポーリングで学校が表示されるか確認した

ここまでできていれば、1 から順に「何をしたらいいか」は完了です。
