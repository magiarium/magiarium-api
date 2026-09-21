import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ApiResultBase, ItemId, ItemType } from '@magiarium/structure';
import { MAGIARIUM_TABLE_NAME } from '../../constants';
import { ApiResponseBase } from '../../types/common';
import { dynamoDBDocumentClient } from './client';

/**
 * DynamoDBのアイテム統計情報のビューカウントをインクリメントする
 *
 * @param params.itemId アイテムID
 * @param params.itemType アイテム種別
 * @returns アイテム統計情報のビューカウント更新結果
 *
 * @remarks
 * - 200: 処理成功
 * - 500: 予期せぬエラー
 */
export const incrementViewCounts = async ({
  itemId,
  itemType,
}: {
  itemId: ItemId;
  itemType: ItemType;
}): Promise<ApiResponseBase<ApiResultBase<number>>> => {
  try {
    const comand = new UpdateCommand({
      TableName: MAGIARIUM_TABLE_NAME,
      Key: {
        pk: `ITEM#${itemId}`,
        sk: `STATISTICS#${itemType}`,
      },
      UpdateExpression:
        'SET viewCount = if_not_exists(viewCount, :zero) + :increment',
      ExpressionAttributeValues: {
        ':increment': 1,
        ':zero': 0, // viewCountが存在しない場合の初期値
      },
      ReturnValues: 'UPDATED_NEW',
    });
    const result = await dynamoDBDocumentClient.send(comand);
    return {
      statusCode: 200,
      body: {
        success: true,
        results: result.Attributes?.viewCount?.N
          ? Number(result.Attributes.viewCount.N)
          : 0,
      },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          message: 'ビューカウントの更新に失敗しました。',
          details: [
            {
              field: 'incrementViewCounts',
              errorType: 'SYSTEM_ERROR',
              issue: `予期せぬエラー`,
            },
          ],
        },
      },
    };
  }
};
