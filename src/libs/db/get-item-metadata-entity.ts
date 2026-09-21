import { GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  ApiResultBase,
  ItemId,
  ItemState,
  ItemType,
} from '@magiarium/structure';
import { CustomError } from '../../common/custom-error';
import { MAGIARIUM_TABLE_NAME } from '../../constants';
import type { ApiResponseBase } from '../../types/common';
import {
  DraftItemMetadataEntity,
  PublicItemMetadataEntity,
} from '../../types/entity';
import { dynamoDBDocumentClient } from './client';

type GetItemMetadataEntityResult<
  T extends ItemType = ItemType,
  U extends ItemState = ItemState,
> = ApiResultBase<
  { draft: DraftItemMetadataEntity<T>; public: PublicItemMetadataEntity<T> }[U]
>;
type GetItemMetadataEntityResponse<
  T extends ItemType = ItemType,
  U extends ItemState = ItemState,
> = ApiResponseBase<GetItemMetadataEntityResult<T, U>>;

/**
 * DynamoDBからアイテムメタデータのEntityを取得する処理
 *
 * @param params.itemId アイテムID
 * @param params.itemType アイテム種別
 * @param params.itemState 公開状態
 * @returns アイテムメタデータEntity取得結果
 *
 * @remarks
 * - 200: 処理成功
 * - 404: 検索結果なし
 * - 500: 予期せぬエラー
 */
export const getItemMetadataEntity = async <
  T extends ItemType = ItemType,
  U extends ItemState = ItemState,
>({
  itemId,
  itemType,
  itemState,
}: {
  itemId: ItemId;
  itemType: T;
  itemState?: U;
}): Promise<GetItemMetadataEntityResponse<T, U>> => {
  try {
    const command = new GetCommand({
      TableName: MAGIARIUM_TABLE_NAME,
      Key: {
        pk: `ITEM#${itemId}${itemState === 'draft' ? '#DRAFT' : ''}`,
        sk: `METADATA#${itemType}`,
      },
    });
    const response = await dynamoDBDocumentClient.send(command);

    if (!response.Item) {
      throw new CustomError<GetItemMetadataEntityResult>({
        statusCode: 404,
        body: {
          success: false,
          error: {
            message: 'アイテムメタデータ取得エラー',
            details: [
              {
                field: 'getItemMetadataEntity',
                errorType: 'BUSINESS_ERROR',
                issue: `対象アイテムが見つかりません。itemType=[${itemType}], itemState=[${itemState}], itemId=[${itemId}].`,
              },
            ],
          },
        },
      });
    }

    return {
      statusCode: 200,
      body: {
        success: true,
        results: response.Item as {
          draft: DraftItemMetadataEntity<T>;
          public: PublicItemMetadataEntity<T>;
        }[U],
      },
    };
  } catch (error) {
    if (error instanceof CustomError) {
      return error;
    }
    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          message: 'アイテムメタデータ取得エラー',
          details: [
            {
              field: 'getItemMetadataEntity',
              errorType: 'SYSTEM_ERROR',
              issue: '予期せぬエラー',
            },
          ],
        },
      },
    };
  }
};
