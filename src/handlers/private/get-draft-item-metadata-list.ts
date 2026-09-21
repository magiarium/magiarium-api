import {
  GetDraftItemMetadataListRequest,
  GetDraftItemMetadataListResult,
  ITEM_TYPE,
} from '@magiarium/structure';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CustomError } from '../../common/custom-error';
import { convertLambdaResponse } from '../../common/response';
import { convertItemMetadataFromEntity } from '../../libs/convert-item-metadata-entity';
import { searchDraftItemMetadataEntities } from '../../libs/db/search-draft-item-metadata-entities';
import { ApiResponseBase } from '../../types/common';

type GetDraftItemMetadataListResponse =
  ApiResponseBase<GetDraftItemMetadataListResult>;

/**
 * 下書きメタデータ一覧取得処理
 *
 * @param event API Gatewayから渡されるリクエストイベント
 * @returns 下書きメタデータ一覧取得処理結果を含むLambdaレスポンス\
 *
 * @remarks
 * - 200: 処理成功
 * - 400: パラメータ不正
 * - 404: 検索結果なし
 * - 500: 予期せぬエラー
 */
export const getDraftItemMetadataList = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let response: GetDraftItemMetadataListResponse;
  try {
    // 1.パラメータチェック
    if (event.pathParameters === undefined) {
      throw new CustomError<GetDraftItemMetadataListResult>({
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
      event.pathParameters as GetDraftItemMetadataListRequest['params'];
    const itemType = params?.itemType;
    if (!ITEM_TYPE.includes(itemType)) {
      throw new CustomError<GetDraftItemMetadataListResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: `不正なリクエスト`,
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

    // 2.検索処理
    const searchDraftItemMetadataEntitiesResponse =
      await searchDraftItemMetadataEntities(itemType);

    if (!searchDraftItemMetadataEntitiesResponse.body.success) {
      throw new CustomError<GetDraftItemMetadataListResult>(
        searchDraftItemMetadataEntitiesResponse
      );
    }
    // EntityをAPIレスポンス型に変換
    const results = searchDraftItemMetadataEntitiesResponse.body.results.map(
      (targetEntity) => convertItemMetadataFromEntity(targetEntity)
    );
    response = {
      statusCode: 200,
      body: {
        success: true,
        results,
      },
    };
  } catch (error) {
    if (error instanceof CustomError) {
      response = error;
    }
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
  return convertLambdaResponse<GetDraftItemMetadataListResult>()(response);
};
