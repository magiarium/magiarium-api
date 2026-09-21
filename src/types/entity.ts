import {
  DateTimeString,
  ItemId,
  ItemMetadata,
  ItemType,
} from '@magiarium/structure';
import { ZeroPadNumber } from './common';

/**
 * アイテム統計情報Entity
 */
export type ItemStatisticsEntity<T extends ItemType = ItemType> = {
  pk: `ITEM#${ItemId}`;

  /** ラベル(SK) */
  sk: `STATISTICS#${T}`;

  /** アイテムID */
  itemId: ItemId;

  /** アイテム種別 */
  itemType: T;

  /** ビューカウント */
  viewCount: number;

  // メタデータ検索用
  gsi_statistics_viewCount_pk: `STATISTICS#${T}`;
  gsi_statistics_viewCount_sk: `ITEM#${ItemId}`;
};

/**
 * アイテムメタデータEntity
 */
export type ItemMetadataEntity<T extends ItemType = ItemType> =
  PublicItemMetadataEntity<T> | DraftItemMetadataEntity<T>;

/**
 * 公開済みアイテムメタデータEntity
 */
export type PublicItemMetadataEntity<T extends ItemType = ItemType> =
  ItemMetadata<T> & {
    /** アイテムID(PK) */
    pk: `ITEM#${ItemId}`;

    /** ラベル(SK) */
    sk: `METADATA#${T}`;

    // メタデータ検索用
    gsi_itemType_publishedAt_pk: `ITEMTYPE#${T}`;
    gsi_itemType_publishedAt_sk: `PUBLISHED_AT#${DateTimeString}`;

    // メタデータ検索用
    gsi_itemType_viewCount_pk: `ITEMTYPE#${T}`;
    gsi_itemType_viewCount_sk: `VIEWCOUNTD#${ZeroPadNumber}`;
  };

/**
 * 下書きアイテムメタデータEntity
 */
export type DraftItemMetadataEntity<T extends ItemType = ItemType> =
  ItemMetadata<T> & {
    /** アイテムID(PK) */
    pk: `ITEM#${ItemId}#DRAFT`;

    /** ラベル(SK) */
    sk: `METADATA#${T}`;

    // メタデータ検索用
    gsi_draft_updatedAt_pk: `DRAFT#${T}`;
    gsi_draft_updatedAt_sk: `UPDATED_AT#${DateTimeString}`;
  };
