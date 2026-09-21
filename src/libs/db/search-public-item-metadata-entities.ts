import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  ApiResultBase,
  ItemType,
  LastEvaluatedKey,
  OrderByType,
} from '@magiarium/structure';
import { CustomError } from '../../common/custom-error';
import { MAGIARIUM_TABLE_NAME } from '../../constants';
import { ApiResponseBase } from '../../types/common';
import { PublicItemMetadataEntity } from '../../types/entity';
import { parsePositiveInt } from '../../utils';
import { dynamoDBDocumentClient } from './client';

type SearchPublicItemMetadataEntitiesResult<T extends ItemType = ItemType> =
  ApiResultBase<PublicItemMetadataEntity<T>[]>;

type SearchPublicItemMetadataEntitiesResponse<T extends ItemType = ItemType> =
  ApiResponseBase<SearchPublicItemMetadataEntitiesResult<T>>;

/**
 * 公開済みアイテムメタデータ検索処理
 *
 * @param params.itemType アイテム種別
 * @param params.orderBy 並び順
 * @param params.limit 取得上限
 * @param params.lastEvaluatedKey 前回検索時の最後のキー
 * @return アイテムメタデータ検索結果
 *
 * @remarks
 * - 200: 処理成功
 * - 404: 検索結果なし
 * - 500: 予期せぬエラー
 */
export const searchPublicItemMetadataEntities = async <
  T extends ItemType = ItemType,
>({
  itemType,
  orderBy = 'published_at_desc',
  limit = 10,
  lastEvaluatedKey,
}: {
  itemType: T;
  orderBy?: OrderByType;
  limit?: string | number;
  lastEvaluatedKey?: LastEvaluatedKey;
}): Promise<SearchPublicItemMetadataEntitiesResponse<T>> => {
  try {
    let command;
    if (orderBy && orderBy.match('^view_count_.+')) {
      command = {
        TableName: MAGIARIUM_TABLE_NAME,
        IndexName: 'gsi_itemType_viewCount',
        KeyConditionExpression:
          '#gsi_itemType_viewCount_pk = :gsi_itemType_viewCount_pk_value',
        ExpressionAttributeNames: {
          '#gsi_itemType_viewCount_pk': 'gsi_itemType_viewCount_pk',
        },
        ExpressionAttributeValues: {
          ':gsi_itemType_viewCount_pk_value': `ITEMTYPE#${itemType}`,
        },
        ScanIndexForward: orderBy === 'view_count_desc' ? false : true,
        Limit: typeof limit === 'number' ? limit : parsePositiveInt(limit, 10),
      };
      if (lastEvaluatedKey) {
        command = {
          ...command,
          ExclusiveStartKey: {
            pk: `ITEM#${lastEvaluatedKey.pk}`,
            sk: `METADATA#${lastEvaluatedKey.sk}`,
            gsi_itemType_viewCount_pk: `ITEMTYPE#${lastEvaluatedKey.gsiPk}`,
            gsi_itemType_viewCount_sk: `VIEWCOUNTD#${lastEvaluatedKey.gsiSk}`,
          },
        };
      }
    } else {
      command = {
        TableName: MAGIARIUM_TABLE_NAME,
        IndexName: 'gsi_itemType_publishedAt',
        KeyConditionExpression:
          '#gsi_itemType_publishedAt_pk = :gsi_itemType_publishedAt_pk_value',
        ExpressionAttributeNames: {
          '#gsi_itemType_publishedAt_pk': 'gsi_itemType_publishedAt_pk',
        },
        ExpressionAttributeValues: {
          ':gsi_itemType_publishedAt_pk_value': `ITEMTYPE#${itemType}`,
        },
        ScanIndexForward: orderBy === 'published_at_desc' ? false : true,
        Limit: typeof limit === 'number' ? limit : parsePositiveInt(limit, 10),
      };
      if (lastEvaluatedKey) {
        command = {
          ...command,
          ExclusiveStartKey: {
            pk: `ITEM#${lastEvaluatedKey.pk}`,
            sk: `METADATA#${lastEvaluatedKey.sk}`,
            gsi_itemType_publishedAt_pk: `ITEMTYPE#${lastEvaluatedKey.gsiPk}`,
            gsi_itemType_publishedAt_sk: `PUBLISHED_AT#${lastEvaluatedKey.gsiSk}`,
          },
        };
      }
    }

    const response = await dynamoDBDocumentClient.send(
      new QueryCommand(command)
    );

    if (!response?.Items) {
      throw new CustomError<SearchPublicItemMetadataEntitiesResult>({
        statusCode: 404,
        body: {
          success: false,
          error: {
            message: '公開済みアイテムメタデータ取得エラー',
            details: [
              {
                field: 'searchPublicItemMetadataEntities',
                errorType: 'BUSINESS_ERROR',
                issue: `対象アイテムが見つかりません。itemType=[${itemType}], lastEvaluatedKey=[${lastEvaluatedKey}]`,
              },
            ],
          },
        },
      });
    }

    const results = response.Items as PublicItemMetadataEntity<T>[];

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
          message: '公開済みアイテムメタデータ取得エラー',
          details: [
            {
              field: 'searchPublicItemMetadataEntities',
              errorType: 'SYSTEM_ERROR',
              issue: '予期せぬエラー',
            },
          ],
        },
      },
    };
  }
};
