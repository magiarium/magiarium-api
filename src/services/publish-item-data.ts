import { ApiResultBase, ItemId, ItemType } from '@magiarium/structure';
import { CustomError } from '../common/custom-error';
import { convertItemMetadataFromEntity } from '../libs/convert-item-metadata-entity';
import { copyS3Object } from '../libs/s3/copy-s3-object';
import { ApiResponseBase } from '../types/common';
import {
  DraftItemMetadataEntity,
  PublicItemMetadataEntity,
} from '../types/entity';
import { deleteDraftItemData } from './delete-draft-item-data';
import { publishItemMetadata } from './publish-item-metadata';

type PublishItemDataResult = ApiResultBase<undefined>;

type PublishItemDataResponse = ApiResponseBase<PublishItemDataResult>;

/**
 * アイテムデータ公開処理
 * @param params.itemId アイテムID
 * @param params.itemType アイテム種別
 * @param params.draftItemMetadataEntity 下書きアイテムメタデータEntity
 * @param params.draftItemDataResourceList 下書きアイテムデータリソース一覧
 * @param params.publlicItemMetadataEntity 公開済みアイテムメタデータEntity
 * @returns 下書きアイテムデータ公開処理結果
 *
 * @remarks
 * - 200: 処理成功
 * - 500: システムエラー
 */
export const publishItemData = async <T extends ItemType = ItemType>({
  itemId,
  itemType,
  draftItemMetadataEntity,
  draftItemDataResourceList,
  publicItemMetadataEntity,
}: {
  itemId: ItemId;
  itemType: T;
  draftItemMetadataEntity: DraftItemMetadataEntity<T>;
  draftItemDataResourceList: string[];
  publicItemMetadataEntity?: PublicItemMetadataEntity<T>;
}): Promise<PublishItemDataResponse> => {
  let response: PublishItemDataResponse;

  try {
    // リソースデータ公開
    for (const targetPath of draftItemDataResourceList) {
      const fromPath = `items/${itemType}/${itemId}/draft/${targetPath}`;
      const toPath = `items/${itemType}/${itemId}/public/${targetPath}`;
      const targetResourceCopyResponse = await copyS3Object({
        fromPath,
        toPath,
      });
      if (!targetResourceCopyResponse.body.success) {
        throw new CustomError<PublishItemDataResult>(
          targetResourceCopyResponse
        );
      }
    }

    // コンテンツ公開
    const publishContentResponse = await copyS3Object({
      fromPath: `items/${itemType}/${itemId}/draft/content.json`,
      toPath: `items/${itemType}/${itemId}/public/content.json`,
    });
    if (!publishContentResponse.body.success) {
      throw new CustomError<PublishItemDataResult>(publishContentResponse);
    }

    // メタデータ公開
    const putPublicItemMetadataResponse = await publishItemMetadata({
      itemId,
      itemType,
      draftItemMetadata: convertItemMetadataFromEntity(draftItemMetadataEntity),
      publicItemMetadata: publicItemMetadataEntity
        ? convertItemMetadataFromEntity(publicItemMetadataEntity)
        : undefined,
    });
    if (!putPublicItemMetadataResponse.body.success) {
      throw new CustomError<PublishItemDataResult>({
        statusCode: putPublicItemMetadataResponse.statusCode,
        body: putPublicItemMetadataResponse.body,
      });
    }

    // 下書きデータ削除
    await deleteDraftItemData({
      itemId,
      itemType,
      deleteResourcePaths: draftItemDataResourceList,
    });
    // 下書きデータ削除は失敗しても無害なので、エラーにしない
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
