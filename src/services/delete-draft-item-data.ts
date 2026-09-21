import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import {
  ApiResultBase,
  ErrorDetail,
  ItemId,
  ItemType,
} from '@magiarium/structure';
import { MAGIARIUM_TABLE_NAME } from '../constants';
import { dynamoDBDocumentClient } from '../libs/db/client';
import { deleteS3Object } from '../libs/s3/delete-s3-object';
import { ApiResponseBase } from '../types/common';

type DeleteItemDataResult = ApiResultBase<undefined>;

type DeleteItemDataResponse = ApiResponseBase<DeleteItemDataResult>;

/**
 * 下書きデータ削除処理
 * ※公開済みデータの削除は設計的に許可しない。（必要になれば論理削除で実装すること）
 *
 * @param params.itemId アイテムID
 * @param params.itemType アイテム種別
 * @param params.deleteResourcePaths 削除対象リソースパス一覧
 * @returns 下書きデータ削除処理結果
 *
 * @remarks
 * - 200: 処理成功
 * - 404: 対象オブジェクトが存在しないエラー
 * - 500: 予期せぬエラー
 */
export const deleteDraftItemData = async ({
  itemId,
  itemType,
  deleteResourcePaths,
}: {
  itemId: ItemId;
  itemType: ItemType;
  deleteResourcePaths: string[];
}): Promise<DeleteItemDataResponse> => {
  const failures: ErrorDetail[] = [];
  // メタデータ削除
  try {
    await dynamoDBDocumentClient.send(
      new DeleteCommand({
        TableName: MAGIARIUM_TABLE_NAME,
        Key: {
          pk: `ITEM#${itemId}#DRAFT`,
          sk: `METADATA#${itemType}`,
        },
      })
    );
  } catch {
    failures.push({
      field: 'deleteDraftItemData',
      errorType: 'SYSTEM_ERROR',
      issue: '下書きメタデータの削除に失敗しました。',
    });
  }

  // コンテンツ&リソース削除
  const deletePaths = [
    `items/${itemType}/${itemId}/draft/content.json`,
    ...new Set(
      deleteResourcePaths.map(
        (targetPath) =>
          `items/${itemType}/${itemId}/draft/resources/${targetPath}`
      )
    ),
  ];
  await Promise.all(
    deletePaths.map(async (path) => {
      const result = await deleteS3Object(path);

      if (!result.body.success && result.body.error.details) {
        failures.push(...result.body.error.details);
      }
    })
  );
  // 失敗
  if (failures.length !== 0) {
    // TODO: 下書きデータは非公開のため、データの整合性やトランザクションは気にしない方針
    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          message:
            '削除処理に失敗しました。一部ゴミデータが残っている場合は手動で削除してください。',
          details: failures,
        },
      },
    };
  }
  return {
    statusCode: 200,
    body: {
      success: true,
      results: undefined,
    },
  };
};
