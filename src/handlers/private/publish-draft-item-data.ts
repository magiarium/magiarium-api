import {
  ITEM_ID_PATTERN,
  ITEM_TYPE,
  PublishDraftItemDataRequest,
  PublishDraftItemDataResult,
  SaveDraftItemDataResult,
} from '@magiarium/structure';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CustomError } from '../../common/custom-error';
import { convertLambdaResponse } from '../../common/response';
import { getItemMetadataEntity } from '../../libs/db/get-item-metadata-entity';
import { getItemDataResourceList } from '../../services/get-item-data-resource-list';
import { publishItemData } from '../../services/publish-item-data';
import { ApiResponseBase } from '../../types/common';

type PublishDraftItemDataResponse = ApiResponseBase<PublishDraftItemDataResult>;

/**
 * 下書きアイテムデータ公開処理
 *
 * @param event API Gatewayから渡されるリクエストイベント
 * @returns 下書きアイテムデータ公開処理結果を含むLambdaレスポンス
 *
 * @remarks
 * - 200: 処理成功
 * - 400: パラメータ不正
 * - 500: 予期せぬエラー
 */
export const publishDraftItemData = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let response: PublishDraftItemDataResponse;

  try {
    // 1．パラメータチェック
    if (event.pathParameters === undefined) {
      throw new CustomError<SaveDraftItemDataResult>({
        statusCode: 500,
        body: {
          success: false,
          error: {
            message: '内部エラーが発生しました。',
            details: [
              {
                field: 'event.pathParameters',
                errorType: 'SYSTEM_ERROR',
                issue: 'パスパラメータが取得できませんでした。',
              },
            ],
          },
        },
      });
    }
    const params =
      event.pathParameters as PublishDraftItemDataRequest['params'];
    const itemId = params?.itemId;
    if (!itemId || !ITEM_ID_PATTERN.test(itemId)) {
      throw new CustomError<SaveDraftItemDataResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: '不正なリクエスト',
            details: [
              {
                field: `event.pathParameters.itemId`,
                errorType: 'VALIDATION_ERROR',
                issue: `アイテムIDの形式が不正です。itemId=[${itemId}].`,
              },
            ],
          },
        },
      });
    }
    const itemType = params?.itemType;
    if (!ITEM_TYPE.includes(itemType)) {
      throw new CustomError<SaveDraftItemDataResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: '不正なリクエスト',
            details: [
              {
                field: `event.pathParameters.itemId`,
                errorType: 'VALIDATION_ERROR',
                issue: `不正なアイテム種別が指定されました。expected=[${ITEM_TYPE.join(',')}], actual=[${itemType}].`,
              },
            ],
          },
        },
      });
    }

    // 2．公開対象の下書きメタデータを取得
    const getDraftItemMetadataEntityResponse = await getItemMetadataEntity({
      itemType: itemType,
      itemState: 'draft',
      itemId: itemId,
    });
    if (!getDraftItemMetadataEntityResponse.body.success) {
      throw new CustomError<SaveDraftItemDataResult>({
        statusCode: getDraftItemMetadataEntityResponse.statusCode,
        body: getDraftItemMetadataEntityResponse.body,
      });
    }
    // 3.下書きデータのリソースファイルを取得
    const getItemDataResourceListResponse = await getItemDataResourceList({
      itemId,
      itemType,
    });
    if (!getItemDataResourceListResponse.body.success) {
      throw new CustomError<SaveDraftItemDataResult>({
        statusCode: getItemDataResourceListResponse.statusCode,
        body: getItemDataResourceListResponse.body,
      });
    }
    // TODO: contentのJSON形式が決まった後、リソースファイルの整合性チェックをここで実施する

    // 4.公開済みデータ取得
    const getPublicItemMetadataEntityResponse = await getItemMetadataEntity({
      itemId,
      itemState: 'public',
      itemType,
    });
    // 404エラーの場合は初回登録扱いとして、エラーなし
    if (
      getPublicItemMetadataEntityResponse.statusCode !== 404 &&
      !getPublicItemMetadataEntityResponse.body.success
    ) {
      throw new CustomError<SaveDraftItemDataResult>({
        statusCode: getPublicItemMetadataEntityResponse.statusCode,
        body: getPublicItemMetadataEntityResponse.body,
      });
    }
    const publicItemMetadataEntity = getPublicItemMetadataEntityResponse.body
      .success
      ? getPublicItemMetadataEntityResponse.body.results
      : undefined;

    // データ公開
    const publishDraftItemDataResponse = await publishItemData({
      itemId,
      itemType,
      draftItemMetadataEntity: getDraftItemMetadataEntityResponse.body.results,
      draftItemDataResourceList: getItemDataResourceListResponse.body.results,
      publicItemMetadataEntity,
    });
    response = publishDraftItemDataResponse;
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
  return convertLambdaResponse<PublishDraftItemDataResult>()(response);
};
