import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import {
  ApiResultBase,
  ItemId,
  ItemState,
  ItemType,
} from '@magiarium/structure';
import { CustomError } from '../../common/custom-error';
import { MAGIARIUM_TABLE_NAME } from '../../constants';
import { ApiResponseBase } from '../../types/common';
import {
  DraftItemMetadataEntity,
  PublicItemMetadataEntity,
} from '../../types/entity';
import { dynamoDBDocumentClient } from './client';

type GetItemMetadataEntitiesResult<
  T extends ItemType = ItemType,
  U extends ItemState = ItemState,
> = ApiResultBase<
  {
    public: PublicItemMetadataEntity<T>[];
    draft: DraftItemMetadataEntity<T>[];
  }[U]
>;
type GetItemMetadataEntitiesResponse<
  T extends ItemType = ItemType,
  U extends ItemState = ItemState,
> = ApiResponseBase<GetItemMetadataEntitiesResult<T, U>>;

/**
 * DynamoDBから、対象アイテムメタデータEntity一覧を取得する処理
 *
 * @param itemIds アイテムID一覧
 * @param itemType アイテム種別
 * @param itemState アイテム状態
 * @returns アイテムメタデータEntity一覧
 *
 * @remarks
 * - 200: 処理成功
 * - 400: パラメータ不正
 * - 404: 検索結果なし
 * - 500: 予期せぬエラー
 */
export const getItemMetadataEntities = async <
  T extends ItemType = ItemType,
  U extends ItemState = ItemState,
>({
  itemIds,
  itemType,
  itemState,
}: {
  itemIds: ItemId[];
  itemType: T;
  itemState?: U;
}): Promise<GetItemMetadataEntitiesResponse> => {
  try {
    // パラメータチェック(DyanamoDBの仕様的に、この時点で不要であれば叩かない)
    if (itemIds.length === 0 || itemIds.length > 100) {
      throw new CustomError<GetItemMetadataEntitiesResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: '不正なリクエスト',
            details: [
              {
                field: 'getItemMetadataEntities',
                errorType: 'BUSINESS_ERROR',
                issue: `アイテムIDの指定は1件以上～100件以下にしてください。：現在のリクエスト件数=[${itemIds.length}].`,
              },
            ],
          },
        },
      });
    }
    // 検索用クエリの生成
    const parameterKeys = itemIds.map((itemId) => ({
      pk: `ITEM#${itemId}${itemState === 'draft' ? '#DRAFT' : ''}`,
      sk: `METADATA#${itemType}`,
    }));
    const command = new BatchGetCommand({
      RequestItems: {
        [MAGIARIUM_TABLE_NAME]: {
          Keys: parameterKeys,
        },
      },
    });
    const response = await dynamoDBDocumentClient.send(command);

    if (!response.Responses) {
      throw new CustomError<GetItemMetadataEntitiesResult>({
        statusCode: 404,
        body: {
          success: false,
          error: {
            message: 'アイテムメタデータ取得エラー',
            details: [
              {
                field: 'getItemMetadataEntities',
                errorType: 'BUSINESS_ERROR',
                issue: `対象アイテムが見つかりません。itemType=[${itemType}], itemState=[${itemState}], itemIds=[${itemIds.join(',')}].`,
              },
            ],
          },
        },
      });
    }

    const results = response.Responses[MAGIARIUM_TABLE_NAME] as
      PublicItemMetadataEntity[] | DraftItemMetadataEntity[];

    return {
      statusCode: 200,
      body: {
        success: true,
        results,
      },
    };
  } catch {
    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          message: 'アイテムメタデータ取得エラー',
          details: [
            {
              field: 'getItemMetadataEntities',
              errorType: 'SYSTEM_ERROR',
              issue: '予期せぬエラー',
            },
          ],
        },
      },
    };
  }
};
