import { ItemMetadata, ItemType } from '@magiarium/structure';
import { DraftItemMetadataEntity, ItemMetadataEntity } from '../types/entity';

/**
 * Entityをアイテムメタデータに変換する処理
 *
 * @param itemMetadataEntity アイテムメタデータEntity
 * @returns アイテムメタデータ
 */
export const convertItemMetadataFromEntity = <T extends ItemType = ItemType>(
  itemMetadataEntity: ItemMetadataEntity<T>
): ItemMetadata<T> => {
  if (isDraftItemMetadataEntity(itemMetadataEntity)) {
    const {
      pk,
      sk,
      gsi_draft_updatedAt_pk,
      gsi_draft_updatedAt_sk,
      ...itemMetadata
    } = itemMetadataEntity;

    return itemMetadata;
  }

  const {
    pk,
    sk,
    gsi_itemType_publishedAt_pk,
    gsi_itemType_publishedAt_sk,
    gsi_itemType_viewCount_pk,
    gsi_itemType_viewCount_sk,
    ...itemMetadata
  } = itemMetadataEntity;

  return itemMetadata;
};

/**
 * 対象メタデータEntityが下書き状態かチェックする
 * @param entity 対象メタデータEntity
 * @returns true:下書き状態, false:公開状態
 */
const isDraftItemMetadataEntity = <T extends ItemType>(
  entity: ItemMetadataEntity<T>
): entity is DraftItemMetadataEntity<T> => {
  return entity.itemState === 'draft';
};
