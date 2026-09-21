import {
  ITEM_ID_PATTERN,
  ITEM_TYPE,
  SaveDraftItemDataRequest,
  SaveDraftItemDataResult,
} from '@magiarium/structure';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CustomError } from '../../common/custom-error';
import { convertLambdaResponse } from '../../common/response';
import { putDraftItemData } from '../../services/put-draft-item-data';
import { ApiResponseBase } from '../../types/common';

type SaveDraftItemDataResponse = ApiResponseBase<SaveDraftItemDataResult>;

/**
 * 下書きアイテムデータ保存処理
 *
 * @param event API Gatewayから渡されるリクエストイベント
 * @returns 下書きアイテムデータ保存処理結果を含むLambdaレスポンス
 *
 * @remarks
 * - 200: 処理成功
 * - 400: パラメータ不正
 * - 500: システムエラー
 */
export const saveDraftItemData = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let response: SaveDraftItemDataResponse;

  try {
    // 1.パラメータチェック
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

    const params = event.pathParameters as SaveDraftItemDataRequest['params'];
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
                field: `event.pathParameters.itemType`,
                errorType: 'VALIDATION_ERROR',
                issue: `不正なアイテム種別が指定されました。expected=[${ITEM_TYPE.join(',')}], actual=[${itemType}].`,
              },
            ],
          },
        },
      });
    }
    if (!event.body) {
      throw new CustomError<SaveDraftItemDataResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: '不正なリクエスト',
            details: [
              {
                field: `event.body`,
                errorType: 'VALIDATION_ERROR',
                issue: `リクエストボディは必須です。`,
              },
            ],
          },
        },
      });
    }
    let itemData;
    try {
      itemData = JSON.parse(event.body);
    } catch {
      throw new CustomError<SaveDraftItemDataResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: '不正なリクエスト',
            details: [
              {
                field: `event.body`,
                errorType: 'VALIDATION_ERROR',
                issue: `リクエストボディのJSONパースに失敗しました。`,
              },
            ],
          },
        },
      });
    }

    // 2.保存処理
    const putDraftItemDataResponse = await putDraftItemData({
      itemId,
      itemType,
      itemData,
    });
    if (!putDraftItemDataResponse.body.success) {
      throw new CustomError<SaveDraftItemDataResult>(putDraftItemDataResponse);
    }
    // 更新成功
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
  return convertLambdaResponse<SaveDraftItemDataResult>()(response);
};
