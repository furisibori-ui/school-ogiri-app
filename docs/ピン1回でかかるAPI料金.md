# ピンを1回刺したときにかかる API 料金

地図で**ピンを1本刺して学校を1回生成**したときに呼ばれる API と、かかる料金の目安をまとめています。

---

## 流れの概要

1. **ピンを刺す** → ブラウザから **Google Maps 系 API** が多数呼ばれる（住所・周辺施設取得）
2. **「学校を生成」** → サーバーで **Claude / Replicate / CometAPI** が呼ばれる

---

## 1. ピン刺し時（クライアント側・MapSelector）

| API | 呼び出し回数 | 料金の目安（USD/1,000回） | ピン1回あたり |
|-----|--------------|---------------------------|----------------|
| **Geocoding**（住所取得） | 1回 | $5.00（無料枠 10,000回/月） | 約 $0.005 |
| **Places API - Nearby Search** | **約10回**（最大13回・不足時のみ追加3カテゴリ） | $32.00（Pro・無料枠 5,000回/月） | 約 $0.32（無料枠超過時） |
| **Places API - Place Details** | **20回**（周辺施設の詳細） | $17.00（Pro・無料枠 5,000回/月） | 約 $0.34（無料枠超過時） |
| **Wikipedia API** | 20回 | 無料 | $0 |

### 補足

- **Nearby Search**: `MapSelector.tsx` の `searchCategories` で **10種類**（飲食・コンビニ・学校・公園・神社・寺・駅・図書館・観光）を 2km 圏内で検索。結果が少ないときのみ 5km 圏で追加3カテゴリ（最大13回）。
- **Place Details**: 距離の近い順 20 件について、名前・住所・評価・レビューなどを取得。
- 無料枠内なら **Geocoding / Nearby Search / Place Details は $0**。月の利用が無料枠を超えると上記単価で課金。

---

## 2. 学校生成時（サーバー側・generate-school API）

| API | 呼び出し回数 | 料金の目安 | ピン1回あたり |
|-----|--------------|------------|----------------|
| **Anthropic（Claude）** | 1回（長文メッセージ） | 入力約 $3/100万トークン、出力約 $15/100万トークン | 数円〜数十円程度（トークン量による） |
| **Replicate（画像）** | **2回**（ロゴ 1回 + 概要画像 1回） | 約 $0.002〜0.01/枚 | 約 1〜2 円 |
| **CometAPI（校歌）** | 1回（校歌 1 曲） | 約 21 円/曲 | 約 21 円 |

### 補足

- **Claude**: 地域リサーチ結果＋プロンプトで 1 回の `messages.create`。トークン数が多いため、1 回あたりのコストは数円〜数十円になり得る。
- **Replicate**: `/api/generate-logo` 1回、`/api/generate-image`（概要画像）1回。
- **CometAPI**: 校歌を有効にしている場合のみ 1 回。

---

## 3. ピン1回あたりの合計目安（無料枠超過時）

| 項目 | 目安（円） |
|------|------------|
| Google（Geocoding + Nearby Search + Place Details） | 無料枠内なら 0 円 / 超過時 約 50〜60 円 |
| Claude（Anthropic） | 約 10〜50 円 |
| Replicate（画像 2 枚） | 約 1〜2 円 |
| CometAPI（校歌 1 曲） | 約 21 円 |
| **合計（無料枠超過時）** | **約 100〜150 円/回** |

※ 無料枠内であれば Google 分は 0 円。Claude・Replicate・Comet のみで **約 30〜75 円/回** 程度。

---

## 4. 無料枠の目安（Google Maps Platform）

- **Geocoding**: 月 10,000 回まで無料
- **Places - Nearby Search**: 月 5,000 回まで無料（Pro）
- **Places - Place Details**: 月 5,000 回まで無料（Pro）

ピン 1 回で Nearby Search 約 10〜13 回 + Place Details 20 回 + Geocoding 1 回 なので、**月に約 380 回以上ピンを刺して学校生成すると、Google の無料枠を超えやすくなります**（10×380 ≒ 3,800 で Nearby Search が 5,000 に近づく想定）。

---

## 5. 参照リンク

- [Google Maps Platform 料金](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Anthropic 料金](https://www.anthropic.com/pricing)
- [Replicate 料金](https://replicate.com/pricing)
- [CometAPI](https://www.cometapi.com/)（楽曲）

画像・楽曲の設定手順は **docs/API連携の方法.md** を参照してください。
