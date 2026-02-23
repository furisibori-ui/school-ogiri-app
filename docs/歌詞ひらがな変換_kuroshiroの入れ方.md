# 歌詞を Suno 用にひらがなにする（kuroshiro の入れ方）

校歌の歌詞を **Suno に送るときだけ** ひらがなに変換する機能を使うには、次のパッケージが必要です。  
（`package.json` にはすでに書いてあります。**インストールコマンドを一度実行するだけ**です。）

---

## 手順（どのパッケージマネージャーを使っているかで分岐）

### 1. ターミナルを開く

- **Mac**: アプリ「ターミナル」を開く  
- **Windows**: コマンドプロンプト、または PowerShell を開く  
- **Cursor / VS Code**: メニュー「ターミナル」→「新しいターミナル」でも可

---

### 2. プロジェクトのフォルダに移動する

次のどちらかで、**学校大喜利アプリのフォルダ**（`package.json` がある場所）に移動します。

- 普段 `school-ogiri-app` を開いている場合（リポジトリ直下）:
  ```bash
  cd /Users/d18212/Desktop/plan02/school-ogiri-app
  ```
- すでに `plan02` の中にいる場合:
  ```bash
  cd school-ogiri-app
  ```

「どこにいるか分からない」ときは、先に次のコマンドで確認できます。

```bash
pwd
ls
```

`package.json` や `app` フォルダが見える場所が、プロジェクトのフォルダです。

---

### 3. 依存関係をインストールする

**npm を使っている場合（一番多い）:**

```bash
npm install
```

**yarn を使っている場合:**

```bash
yarn install
```

**pnpm を使っている場合:**

```bash
pnpm install
```

「どれを使っているか分からない」場合は、まず **`npm install`** を試して問題ありません。  
（このプロジェクトは `package-lock.json` があれば npm、`yarn.lock` があれば yarn、`pnpm-lock.yaml` があれば pnpm を使っていることが多いです。）

---

### 4. 入ったか確認する（任意）

次のコマンドで、`kuroshiro` が入っているか確認できます。

```bash
npm list kuroshiro kuroshiro-analyzer-kuromoji
```

`kuroshiro@...` と `kuroshiro-analyzer-kuromoji@...` が表示されれば OK です。

---

### 5. デプロイする（Vercel で動かしている場合）

- ローカルで試すだけなら、ここまでで完了です。`npm run dev` で起動して「学校生成」で校歌まで流せば、Suno に送る歌詞がひらがなになります。
- **Vercel にデプロイしている場合**は、上記の変更を **push したうえで、Vercel が自動で `npm install` してビルド**するので、**push + デプロイが完了すれば**本番でも「サイトは漢字・Suno にはひらがな」が動きます。  
  （Vercel のビルドコマンドが `npm run build` なら、その前に `npm install` が実行されます。）

---

## まとめ

1. ターミナルを開く  
2. `cd` で **`school-ogiri-app`** に移動  
3. **`npm install`**（または `yarn install` / `pnpm install`）を実行  
4. 本番も使うなら、コードを push して Vercel でデプロイ  

これで「サイトは漢字のまま・Suno にはひらがな」の流れが動きます。
