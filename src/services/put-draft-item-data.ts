import { PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  ApiResultBase,
  ItemData,
  ItemId,
  ItemType,
} from '@magiarium/structure';
import dayjs from 'dayjs';
import { CustomError } from '../common/custom-error';
import { MAGIARIUM_TABLE_NAME } from '../constants';
import { dynamoDBDocumentClient } from '../libs/db/client';
import { putS3Object } from '../libs/s3/put-s3-object';
import { ApiResponseBase } from '../types/common';
import { DraftItemMetadataEntity } from '../types/entity';

type PutDraftItemDataResult = ApiResultBase<undefined>;

type PutDraftItemDataResponse = ApiResponseBase<PutDraftItemDataResult>;

/**
 * 下書きアイテムデータ保存処理
 *
 * @param params.itemId アイテムID
 * @param params.itemType アイテム種別
 * @param params.itemData アイテムデータ
 * @returns 下書きアイテムデータ保存処理結果
 *
 * @remarks
 * - 200: 処理成功
 * - 500: システムエラー
 */
export const putDraftItemData = async ({
  itemId,
  itemType,
  itemData,
}: {
  itemId: ItemId;
  itemType: ItemType;
  itemData: ItemData;
}): Promise<PutDraftItemDataResponse> => {
  let response: PutDraftItemDataResponse;
  try {
    const { viewCount: _viewCount, content, ...metadata } = itemData;
    // 0．viewCountは不要なので破棄(Publish時にStatisticsデータを取得→反映する)
    // 1．content → JSON化してS3アップロード
    const putS3ObjectResponse = await putS3Object({
      path: `items/${itemId}/draft/${itemType}/content.json`,
      body: JSON.stringify(content),
    });
    if (!putS3ObjectResponse.body.success) {
      throw new CustomError<PutDraftItemDataResult>(putS3ObjectResponse);
    }

    // 2．metadata → 下書き版のMetadataをDBに書き込み
    try {
      const updatedAt = dayjs().format('yyyyMMddHHmmss');
      const command = new PutCommand({
        TableName: MAGIARIUM_TABLE_NAME,
        Item: {
          ...metadata,
          itemId,
          itemType,
          itemState: 'draft',
          pk: `ITEM#${itemId}#DRAFT`,
          sk: `METADATA#${itemType}`,
          gsi_draft_updatedAt_pk: `DRAFT#${itemType}`,
          gsi_draft_updatedAt_sk: `UPDATED_AT#${updatedAt}`,
        } as DraftItemMetadataEntity,
      });
      await dynamoDBDocumentClient.send(command);
    } catch (error) {
      throw new CustomError<PutDraftItemDataResult>({
        statusCode: 500,
        body: {
          success: false,
          error: {
            message: '下書きメタデータ保存エラー',
            details: [
              {
                field: 'putItemData',
                errorType: 'SYSTEM_ERROR',
                issue: `下書きメタデータのDB保存に失敗しました。itemType=[${itemType}], itemId=[${itemId}].`,
              },
            ],
          },
        },
      });
    }
    response = {
      statusCode: 200,
      body: {
        success: true,
        results: undefined,
      },
    };
  } catch (error) {
    if (error instanceof CustomError) {
      response = error;
    } else {
      response = {
        statusCode: 500,
        body: {
          success: false,
          error: {
            message: '予期せぬエラー',
          },
        },
      };
    }
  }
  return response;
};
