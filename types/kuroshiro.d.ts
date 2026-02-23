/** kuroshiro に型定義がないため、モジュール宣言でビルドを通す */
declare module 'kuroshiro' {
  class Kuroshiro {
    init(analyzer: unknown): Promise<void>
    convert(text: string, options: { to: 'hiragana' }): Promise<string>
  }
  export default Kuroshiro
}

declare module 'kuroshiro-analyzer-kuromoji' {
  class KuromojiAnalyzer {
    // 実装は kuroshiro が利用するだけなので any で十分
  }
  export default KuromojiAnalyzer
}
