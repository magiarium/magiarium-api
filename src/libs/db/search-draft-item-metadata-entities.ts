import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ApiResultBase, ItemType } from '@magiarium/structure';
import { CustomError } from '../../common/custom-error';
import { MAGIARIUM_TABLE_NAME } from '../../constants';
import { ApiResponseBase } from '../../types/common';
import { DraftItemMetadataEntity } from '../../types/entity';
import { dynamoDBDocumentClient } from './client';

type SearchDraftItemMetadataEntitiesResult<T extends ItemType = ItemType> =
  ApiResultBase<DraftItemMetadataEntity<T>[]>;

type SearchDraftItemMetadataEntitiesResponse<T extends ItemType = ItemType> =
  ApiResponseBase<SearchDraftItemMetadataEntitiesResult<T>>;

/**
 * 下書きアイテムメタデータEntity検索処理
 * ※下書きデータはそれほど多くないため、更新順で全件取得する
 *
 * @param params.itemType アイテム種別
 * @return 下書きアイテムメタデータEntity検索結果
 *
 * @remarks
 * - 200: 処理成功
 * - 404: 検索結果なし
 * - 500: 予期せぬエラー
 */
export const searchDraftItemMetadataEntities = async <
  T extends ItemType = ItemType,
>(
  itemType: T
): Promise<SearchDraftItemMetadataEntitiesResponse<T>> => {
  try {
    // 検索用クエリの生成
    const command = {
      TableName: MAGIARIUM_TABLE_NAME,
      IndexName: 'gsi_draft_updatedAt',
      KeyConditionExpression:
        '#gsi_draft_updatedAt_pk = :gsi_draft_updatedAt_pk_value',
      ExpressionAttributeNames: {
        '#gsi_draft_updatedAt_pk': 'gsi_draft_updatedAt_pk',
      },
      ExpressionAttributeValues: {
        ':gsi_draft_updatedAt_pk_value': `DRAFT#${itemType}`,
      },
      ScanIndexForward: false,
    };

    const response = await dynamoDBDocumentClient.send(
      new QueryCommand(command)
    );
    if (!response?.Items) {
      throw new CustomError<SearchDraftItemMetadataEntitiesResult>({
        statusCode: 404,
        body: {
          success: false,
          error: {
            message: '下書きアイテムメタデータ取得エラー',
            details: [
              {
                field: 'searchPublicItemMetadataEntities',
                errorType: 'BUSINESS_ERROR',
                issue: `対象アイテムが見つかりません。itemType=[${itemType}].`,
              },
            ],
          },
        },
      });
    }
    const results = response.Items as DraftItemMetadataEntity<T>[];

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
          message: '下書きアイテムメタデータ取得エラー',
          details: [
            {
              field: 'searchDraftItemMetadataEntities',
              errorType: 'SYSTEM_ERROR',
              issue: '予期せぬエラー',
            },
          ],
        },
      },
    };
  }
};
