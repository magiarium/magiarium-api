import {
  NativeAttributeValue,
  QueryCommand,
  QueryCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { ApiResultBase, ItemType } from '@magiarium/structure';
import { CustomError } from '../../common/custom-error';
import { MAGIARIUM_TABLE_NAME } from '../../constants';
import { ApiResponseBase, ItemStaticsInfo } from '../../types/common';
import { dynamoDBDocumentClient } from './client';

type GetItemStatisticsEntitiesResult<T extends ItemType = ItemType> =
  ApiResultBase<ItemStaticsInfo<T>[]>;
type GetItemStatisticsEntitiesResponse<T extends ItemType = ItemType> =
  ApiResponseBase<GetItemStatisticsEntitiesResult<T>>;

/**
 * 全アイテム統計情報取得処理
 * @param itemType アイテム種別
 * @returns アイテム統計情報リスト
 *
 * @remarks
 * - 200: 処理成功
 * - 500: システムエラー
 */
export const getItemStatisticsAll = async <T extends ItemType = ItemType>(
  itemType: T
): Promise<GetItemStatisticsEntitiesResponse<T>> => {
  let response: GetItemStatisticsEntitiesResponse<T>;
  let lastEvaluatedKey: Record<string, NativeAttributeValue> | undefined =
    undefined;
  try {
    const itemStatisticsList: ItemStaticsInfo<T>[] = [];
    while (true) {
      const command = {
        TableName: MAGIARIUM_TABLE_NAME,
        IndexName: 'gsi_statistics_viewCount',
        KeyConditionExpression:
          '#gsi_statistics_viewCount_pk = :gsi_statistics_viewCount_pk_value',
        ExpressionAttributeNames: {
          '#gsi_statistics_viewCount_pk': 'gsi_statistics_viewCount_pk',
        },
        ExpressionAttributeValues: {
          ':gsi_statistics_viewCount_pk_value': `STATISTICS#${itemType}`,
        },
        ScanIndexForward: false,
        ...(lastEvaluatedKey && {
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      };
      const response: QueryCommandOutput = await dynamoDBDocumentClient.send(
        new QueryCommand(command)
      );
      response.Items?.forEach((item) => {
        itemStatisticsList.push({
          itemId: item.itemId,
          itemType: item.itemType,
          viewCount: item.viewCount,
        });
      });
      lastEvaluatedKey = response.LastEvaluatedKey;
      if (!lastEvaluatedKey) {
        break;
      }
    }
    response = {
      statusCode: 200,
      body: {
        success: true,
        results: itemStatisticsList,
      },
    };
  } catch {
    response = new CustomError<GetItemStatisticsEntitiesResult<T>>({
      statusCode: 500,
      body: {
        success: false,
        error: {
          message: 'ビューカウントの全件取得に失敗しました。',
          details: [
            {
              field: 'getItemStatisticsEntities',
              errorType: 'SYSTEM_ERROR',
              issue: `itemType=[${itemType}], lastEvaluatedKey=[${lastEvaluatedKey}]`,
            },
          ],
        },
      },
    });
  }

  return response;
};
