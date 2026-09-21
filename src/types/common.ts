import type { ItemId, ItemType } from '@magiarium/structure';

/**
 * ゼロパディング文字列（10桁固定）
 */
export type ZeroPadNumber = string & { __brand: 'ZeroPadNumber' };

/**
 * アイテム統計情報
 */
export type ItemStaticsInfo<T extends ItemType = ItemType> = {
  /** アイテムID */
  itemId: ItemId;
  /** アイテム種別 */
  itemType: T;
  /** 閲覧数 */
  viewCount: number;
};

/**
 * APIレスポンスの基本型定義
 */
export type ApiResponseBase<T> = {
  /** ステータスコード */
  statusCode: number;
  /** レスポンスボディ */
  body: T;
};
