import {
  ApiResultBase,
  ItemData,
  ItemId,
  ItemState,
  ItemType,
} from '@magiarium/structure';
import { convertItemMetadataFromEntity } from '../libs/convert-item-metadata-entity';
import { getItemMetadataEntity } from '../libs/db/get-item-metadata-entity';
import { ApiResponseBase } from '../types/common';
import { getItemContent } from './get-item-content';

type GetItemDataResult<T extends ItemType = ItemType> = ApiResultBase<
  ItemData<T>
>;
type GetItemDataResponse<T extends ItemType = ItemType> = ApiResponseBase<
  GetItemDataResult<T>
>;

/**
 * アイテムデータ取得処理
 *
 * @param params.itemId アイテムID
 * @param params.itemType アイテム種別
 * @param params.itemState 公開状態
 * @returns アイテムデータ取結果
 *
 * @remarks
 * - 200: 処理成功
 * - 404: 検索結果なし
 * - 500: システムエラー
 */
export const getItemData = async <T extends ItemType = ItemType>({
  itemId,
  itemType,
  itemState,
}: {
  itemId: ItemId;
  itemType: T;
  itemState: ItemState;
}): Promise<GetItemDataResponse> => {
  // メタデータ取得
  const getItemMetadataEntityResponse = await getItemMetadataEntity({
    itemId: itemId,
    itemType,
    itemState,
  });
  if (!getItemMetadataEntityResponse.body.success) {
    return {
      statusCode: getItemMetadataEntityResponse.statusCode,
      body: {
        success: false,
        error: getItemMetadataEntityResponse.body.error,
      },
    };
  }
  const itemMetadata = convertItemMetadataFromEntity(
    getItemMetadataEntityResponse.body.results
  );

  const getItemContentReponse = await getItemContent({
    itemId,
    itemState,
    itemType,
  });
  if (!getItemContentReponse.body.success) {
    return {
      statusCode: getItemContentReponse.statusCode,
      body: {
        success: false,
        error: getItemContentReponse.body.error,
      },
    };
  }
  const itemContent = getItemContentReponse.body.results;

  return {
    statusCode: 200,
    body: {
      success: true,
      results: {
        ...itemMetadata,
        ...itemContent,
      },
    },
  };
};
