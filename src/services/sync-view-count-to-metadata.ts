import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ApiResultBase, ErrorDetail } from '@magiarium/structure';
import { MAGIARIUM_TABLE_NAME } from '../constants';
import { dynamoDBDocumentClient } from '../libs/db/client';
import { ApiResponseBase, ItemStaticsInfo } from '../types/common';

type SyncViewCountToMetadataResult = ApiResultBase<{
  updated: ItemStaticsInfo[];
  failures: ErrorDetail[];
}>;
type SyncViewCountToMetadataResponse =
  ApiResponseBase<SyncViewCountToMetadataResult>;

/**
 * アイテム統計情報をメタデータに反映する処理
 * @param itemStatisticsList アイテム統計情報リスト
 * @returns 反映処理結果
 *
 * @remarks
 * - 200: 処理成功
 * - 500: システムエラー
 */
export const syncViewCountToMetadata = async (
  itemStatisticsList: ItemStaticsInfo[]
): Promise<SyncViewCountToMetadataResponse> => {
  const updatedItemStatisticsList: ItemStaticsInfo[] = [];
  const failures: ErrorDetail[] = [];
  Promise.all(
    itemStatisticsList.map(async (targetItemStatistics) => {
      const command = {
        TableName: MAGIARIUM_TABLE_NAME,
        Key: {
          pk: `ITEM#${targetItemStatistics.itemId}`,
          sk: `METADATA#${targetItemStatistics.itemType}`,
        },
        UpdateExpression: `
            SET #attr = :newValue, 
                #gsi_itemType_viewCount_pk = :gsiPk, 
                #gsi_itemType_viewCount_sk = :gsiSk
            `,
        ConditionExpression: '#attr <> :newValue',
        ExpressionAttributeNames: {
          '#attr': 'viewCount',
          '#gsi_itemType_viewCount_pk': `gsiPk`,
          '#gsi_itemType_viewCount_sk': `gsiSk`,
        },
        ExpressionAttributeValues: {
          ':newValue': targetItemStatistics.viewCount,
          ':gsiPk': `ITEMTYPE#${targetItemStatistics.itemType}`,
          ':gsiSk': `VIEWCOUNTD#${String(targetItemStatistics.viewCount).padStart(10, '0')}`, // ソート用に10桁でゼロ埋め
        },
      };
      try {
        await dynamoDBDocumentClient.send(new UpdateCommand(command));
        updatedItemStatisticsList.push(targetItemStatistics);
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) {
          // 更新対象外のためエラー登録不要
        }
        // それ以外の場合はエラー登録
        failures.push({
          field: 'syncViewCountToMetadata',
          errorType: 'SYSTEM_ERROR',
          issue: `メタデータの閲覧数更新に失敗しました。itemId=[${targetItemStatistics.itemId}], itemType=[${targetItemStatistics.itemType}]`,
        });
      }
    })
  );

  // 全件エラーの場合は失敗扱い
  if (updatedItemStatisticsList.length === 0 && failures.length !== 0) {
    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          message: 'アイテムメタデータ閲覧数更新エラー',
          details: failures,
        },
      },
    };
  }

  // それ以外の場合は成功扱い
  return {
    statusCode: 200,
    body: {
      success: true,
      results: {
        updated: updatedItemStatisticsList,
        failures: failures,
      },
    },
  };
};
