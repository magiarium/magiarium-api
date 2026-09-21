/**
 * Lambda関数の例外用カスタムエラークラス
 *
 * @template T エラー発生時に返却するレスポンスボディの型
 */
export class CustomError<T = never> extends Error {
  /** HTTPステータスコード */
  statusCode: number;
  /** エラー発生時に返却するレスポンスボディ */
  body: T;

  /**
   * CustomError生成コンストラクタ
   *
   * @param params エラー情報
   * @param params.statusCode HTTPステータスコード
   * @param params.body エラー発生時に返却するレスポンスボディ */
  constructor({ statusCode, body }: { statusCode: number; body: NoInfer<T> }) {
    super('CustomError');
    this.statusCode = statusCode;
    this.body = body;
  }
}
