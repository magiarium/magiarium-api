import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import {
  ApiResultBase,
  DateTimeString,
  ItemId,
  ItemMetadata,
  ItemType,
} from '@magiarium/structure';
import dayjs from 'dayjs';
import { CustomError } from '../common/custom-error';
import { MAGIARIUM_TABLE_NAME } from '../constants';
import { dynamoDBDocumentClient } from '../libs/db/client';
import { ApiResponseBase } from '../types/common';
import {
  ItemStatisticsEntity,
  PublicItemMetadataEntity,
} from '../types/entity';
import { toZeroPadNumber } from '../utils';

type PublishItemMetadataResult = ApiResultBase<ItemMetadata>;
type PublishItemMetadataResponse = ApiResponseBase<PublishItemMetadataResult>;

/**
 * アイテムメタデータ公開処理
 *
 * @param params.itemId アイテムID
 * @param params.itemType アイテム種別
 * @param params.draftItemMetadata 下書きアイテムメタデータ
 * @param params.publicItemMetadata 公開アイテムメタデータ
 * @returns アイテムメタデータ公開処理結果
 *
 * @remarks
 * - 200: 処理成功
 * - 500: システムエラー
 */
export const publishItemMetadata = async ({
  itemId,
  itemType,
  draftItemMetadata,
  publicItemMetadata,
}: {
  itemId: ItemId;
  itemType: ItemType;
  draftItemMetadata: ItemMetadata;
  publicItemMetadata?: ItemMetadata | null;
}): Promise<PublishItemMetadataResponse> => {
  const transactItems = [];
  const updatedAt: DateTimeString = dayjs().format(
    'yyyyMMddHHmmss'
  ) as DateTimeString;

  const savedMetadata = {
    ...draftItemMetadata,
    // 公開済みデータがある場合、閲覧数＆公開日は引き継ぎ
    viewCount: publicItemMetadata?.viewCount ?? 0,
    publishedAt: publicItemMetadata?.publishedAt ?? updatedAt,
    // アップデート情報は更新
    updatedAt: updatedAt,
  };

  const metadataEntity: PublicItemMetadataEntity<typeof itemType> = {
    pk: `ITEM#${itemId}`,
    sk: `METADATA#${itemType}`,
    // メタデータ本体
    ...savedMetadata,
    // GSIも更新
    gsi_itemType_publishedAt_pk: `ITEMTYPE#${itemType}`,
    gsi_itemType_publishedAt_sk: `PUBLISHED_AT#${publicItemMetadata?.publishedAt ?? updatedAt}`,

    // メタデータ検索用
    gsi_itemType_viewCount_pk: `ITEMTYPE#${itemType}`,
    gsi_itemType_viewCount_sk: `VIEWCOUNTD#${toZeroPadNumber({
      number: publicItemMetadata?.viewCount ?? 0,
    })}`,
  };
  transactItems.push({
    Put: {
      TableName: MAGIARIUM_TABLE_NAME,
      Item: metadataEntity,
    },
  });
  // 新規作成の場合、Statisticsレコードも新規追加
  if (!publicItemMetadata) {
    transactItems.push({
      Put: {
        TableName: MAGIARIUM_TABLE_NAME,
        Item: {
          pk: `ITEM#${itemId}`,
          sk: `STATISTICS#${itemType}`,
          itemId: itemId,
          itemType: itemType,
          viewCount: 0,
          gsi_statistics_viewCount_pk: `STATISTICS#${itemType}`,
          gsi_statistics_viewCount_sk: `ITEM#${itemId}`,
        } as ItemStatisticsEntity<ItemType>,
      },
    });
  }
  try {
    await dynamoDBDocumentClient.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      })
    );
    return {
      statusCode: 200,
      body: {
        success: true,
        results: savedMetadata,
      },
    };
  } catch {
    throw new CustomError<PublishItemMetadataResult>({
      statusCode: 500,
      body: {
        success: false,
        error: {
          message: 'アイテムデータの公開処理に失敗しました。',
          details: [
            {
              field: 'putPublicItemData',
              errorType: 'SYSTEM_ERROR',
              issue: 'DB書き込みエラー',
            },
          ],
        },
      },
    });
  }
};
