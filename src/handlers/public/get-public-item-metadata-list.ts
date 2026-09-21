import {
  GetItemMetadataListRequest,
  GetItemMetadataListResult,
  ITEM_TYPE,
  ItemId,
} from '@magiarium/structure';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CustomError } from '../../common/custom-error';
import { convertLambdaResponse } from '../../common/response';
import { convertItemMetadataFromEntity } from '../../libs/convert-item-metadata-entity';
import { getItemMetadataEntities } from '../../libs/db/get-item-metadata-entities';
import { searchPublicItemMetadataEntities } from '../../libs/db/search-public-item-metadata-entities';
import { ApiResponseBase } from '../../types/common';

type GetPublicItemMetadataListResponse =
  ApiResponseBase<GetItemMetadataListResult>;

/**
 * 公開済みアイテムメタデータ一覧取得処理
 * @param event API Gatewayから渡されるリクエストイベント
 * @returns アイテムメタデータ検索結果を含むLambdaレスポンス
 *
 * @remarks
 * - 200: 処理成功
 * - 400: パラメータ不正
 * - 404: 検索結果なし
 * - 500: システムエラー
 */
export const getPublicItemMetadataList = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let result: GetPublicItemMetadataListResponse;

  try {
    // 1.パラメータチェック
    if (event.pathParameters === undefined) {
      throw new CustomError<GetItemMetadataListResult>({
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
    const params = event.pathParameters as GetItemMetadataListRequest['params'];
    const itemType = params?.itemType;
    if (!ITEM_TYPE.includes(itemType)) {
      throw new CustomError<GetItemMetadataListResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: `不正なリクエスト`,
            details: [
              {
                field: 'request.params.itemType',
                errorType: 'BUSINESS_ERROR',
                issue: `不正なアイテム種別が指定されました。expected=[${ITEM_TYPE.join(',')}], actual=[${itemType}].`,
              },
            ],
          },
        },
      });
    }

    let results;
    const query =
      event.queryStringParameters as GetItemMetadataListRequest['query'];
    if (query && 'itemIds' in query) {
      const itemIds: ItemId[] = query.itemIds?.split(',') as ItemId[];
      if (itemIds.length === 0 || itemIds.length > 100) {
        throw new CustomError<GetItemMetadataListResult>({
          statusCode: 400,
          body: {
            success: false,
            error: {
              message: '不正なリクエスト',
              details: [
                {
                  field: 'request.params.itemIds',
                  errorType: 'BUSINESS_ERROR',
                  issue: `アイテムIDの指定は1件以上～100件以下にしてください。：現在のリクエスト件数=[${itemIds.length}].`,
                },
              ],
            },
          },
        });
      }

      // 2.検索
      const getItemMetadataEntitiesResponse = await getItemMetadataEntities({
        itemIds,
        itemType,
      });
      if (!getItemMetadataEntitiesResponse.body.success) {
        throw new CustomError<GetItemMetadataListResult>(
          getItemMetadataEntitiesResponse
        );
      }
      // 3.Entity → メタデータに変換
      results = getItemMetadataEntitiesResponse.body.results.map(
        (targetEntity) => convertItemMetadataFromEntity(targetEntity)
      );
    } else {
      // 検索処理
      const searchItemMetadataEntitiesResponse =
        await searchPublicItemMetadataEntities({
          itemType,
          orderBy: query?.orderBy,
          limit: event.queryStringParameters?.limit,
          lastEvaluatedKey: query?.lastEvaluatedKey,
        });
      if (!searchItemMetadataEntitiesResponse.body.success) {
        throw new CustomError<GetItemMetadataListResult>(
          searchItemMetadataEntitiesResponse
        );
      }

      // EntityをAPIレスポンス型に変換
      results = searchItemMetadataEntitiesResponse.body.results.map(
        (targetEntity) => convertItemMetadataFromEntity(targetEntity)
      );
    }
    result = {
      statusCode: 200,
      body: {
        success: true,
        results,
      },
    };
  } catch (error) {
    if (error instanceof CustomError) {
      result = error;
    } else {
      result = {
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

  return convertLambdaResponse<GetItemMetadataListResult>()(result);
};
