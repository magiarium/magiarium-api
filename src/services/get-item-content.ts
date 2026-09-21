import {
  ApiResultBase,
  ItemContent,
  ItemId,
  ItemState,
  ItemType,
} from '@magiarium/structure';
import { getS3Object } from '../libs/s3/get-s3-object';
import { ApiResponseBase } from '../types/common';

type GetItemContentResult<T extends ItemType = ItemType> = ApiResultBase<
  ItemContent<T>
>;
type GetItemContentResponse<T extends ItemType = ItemType> = ApiResponseBase<
  GetItemContentResult<T>
>;
/**
 * アイテムコンテンツ取得処理
 *
 * @param params.itemId アイテムID
 * @param params.itemType アイテム種別
 * @param params.itemState 公開状態
 * @returns アイテムコンテンツ取得結果
 *
 * @remarks
 * - 200: 処理成功
 * - 404: 検索結果なし
 * - 500: 予期せぬエラー
 */
export const getItemContent = async <T extends ItemType = ItemType>({
  itemId,
  itemType,
  itemState,
}: {
  itemId: ItemId;
  itemType: T;
  itemState: ItemState;
}): Promise<GetItemContentResponse<T>> => {
  try {
    // アイテムコンテンツ取得
    const getS3ObjectResponse = await getS3Object(
      `items/${itemId}/${itemState}/${itemType}/content.json`
    );
    if (!getS3ObjectResponse.body.success) {
      return {
        statusCode: getS3ObjectResponse.statusCode,
        body: {
          success: false,
          error: getS3ObjectResponse.body.error,
        },
      };
    }

    let itemContent: ItemContent<T>;
    try {
      itemContent = JSON.parse(getS3ObjectResponse.body.results);
    } catch {
      return {
        statusCode: 500,
        body: {
          success: false,
          error: {
            message: 'アイテムコンテンツの取得処理に失敗しました。',
            details: [
              {
                field: 'getItemContent',
                errorType: 'SYSTEM_ERROR',
                issue: `取得したアイテムコンテンツのJSONパースに失敗しました。`,
              },
            ],
          },
        },
      };
    }

    return {
      statusCode: 200,
      body: {
        success: true,
        results: itemContent,
      },
    };
  } catch {
    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          message: `アイテムコンテンツの取得処理に失敗しました。`,
          details: [
            {
              field: 'getItemContent',
              errorType: 'SYSTEM_ERROR',
              issue: `予期せぬエラー`,
            },
          ],
        },
      },
    };
  }
};
