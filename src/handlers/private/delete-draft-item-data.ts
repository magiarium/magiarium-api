import {
  DeleteDraftItemDataRequest,
  DeleteDraftItemDataResult,
  ITEM_ID_PATTERN,
} from '@magiarium/structure';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CustomError } from '../../common/custom-error';
import { convertLambdaResponse } from '../../common/response';
import { deleteDraftItemData as deleteDraftItemDataExecute } from '../../services/delete-draft-item-data';
import { getItemDataResourceList } from '../../services/get-item-data-resource-list';
import { ApiResponseBase } from '../../types/common';

type DeleteDraftItemDataResponse = ApiResponseBase<DeleteDraftItemDataResult>;

/**
 * 下書きアイテムデータ削除処理
 *
 * @param event API Gatewayから渡されるリクエストイベント
 * @returns 下書きアイテムデータ削除処理結果を含むLambdaレスポンス
 *
 * @remarks
 * - 200: 処理成功
 * - 400: パラメータ不正
 * - 500: システムエラー
 */
export const deleteDraftItemData = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let response: DeleteDraftItemDataResponse;

  try {
    // 1.パラメータチェック
    if (event.pathParameters === undefined) {
      throw new CustomError<DeleteDraftItemDataResult>({
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
    const params = event.pathParameters as DeleteDraftItemDataRequest['params'];
    const itemId = params?.itemId;
    if (!itemId || !ITEM_ID_PATTERN.test(itemId)) {
      throw new CustomError<DeleteDraftItemDataResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: `不正なリクエスト`,
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
    if (!['blog', 'illust', 'novel'].includes(itemType)) {
      throw new CustomError<DeleteDraftItemDataResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: `不正なリクエスト`,
            details: [
              {
                field: 'request.params.itemType',
                errorType: 'BUSINESS_ERROR',
                issue: `アイテムタイプはblog、illust、novelのいずれかを指定してください。：現在のリクエスト=[${itemType}]`,
              },
            ],
          },
        },
      });
    }
    // 2.下書きリソースデータ取得
    const getResourceListResponse = await getItemDataResourceList({
      itemId: itemId,
      itemType: itemType,
    });

    // 3. 削除実処理
    const deleteDraftItemDataResponse = await deleteDraftItemDataExecute({
      itemId,
      itemType,
      deleteResourcePaths: getResourceListResponse.body.success
        ? getResourceListResponse.body.results
        : [],
    });

    if (!deleteDraftItemDataResponse.body.success) {
      throw new CustomError<DeleteDraftItemDataResult>(
        deleteDraftItemDataResponse
      );
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
  return convertLambdaResponse<DeleteDraftItemDataResult>()(response);
};
