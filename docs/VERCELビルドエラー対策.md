# Vercel ビルドエラー「Unexpected token / Expected jsx identifier」について

## 原因

- **Next.js 14.1.0 の SWC**（Rust 製コンパイラ）が、`return` の直後に書いた JSX を正しく解釈できず、`<main` や `<div` を「比較演算子の `<` + 識別子」と誤認してエラーになることがある。
- ローカルや別環境では再現せず、Vercel のビルド環境（Node/SWC の組み合わせ）でだけ出る場合がある。

## 実施した対策

1. **`return` 直後の JSX をやめた**
   - `const content = ( <div>...</div> ); return content;` の形に変更。
   - `return` の直後は識別子だけにし、JSX は変数代入にまとめた。これで SWC の誤パースを避ける。

2. **ルート要素を `<main>` から `<div role="main">` に変更**
   - 一部環境で `main` タグまわりでパース不具合が出る可能性を避けるため。

3. **Babel フォールバック**
   - プロジェクトルートに `.babelrc`（`{"presets": ["next/babel"]}`）を追加。
   - SWC で失敗した場合に Babel でビルドできるようにした。

## まだエラーになる場合

- **Next.js のアップグレード**  
  14.1.0 はセキュリティ修正も含め古いため、`npm install next@14.2.35` などパッチの入った 14.2.x へのアップグレードを検討する。
- **Vercel の再デプロイ**  
  上記変更を push したうえで、Vercel で「Redeploy」を実行する。
