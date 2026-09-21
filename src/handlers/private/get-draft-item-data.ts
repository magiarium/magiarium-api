import {
  GetDraftItemDataRequest,
  GetDraftItemDataResult,
  ITEM_ID_PATTERN,
  ITEM_TYPE,
} from '@magiarium/structure';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CustomError } from '../../common/custom-error';
import { convertLambdaResponse } from '../../common/response';
import { getItemData } from '../../services/get-item-data';
import type { ApiResponseBase } from '../../types/common';

type GetEditItemDataResponse = ApiResponseBase<GetDraftItemDataResult>;

/**
 * 下書きアイテムデータ取得処理
 *
 * @param event API Gatewayから渡されるリクエストイベント
 * @returns 編集用アイテムデータ取得処理結果を含むLambdaレスポンス
 *
 * @remarks
 * - 200: 処理成功
 * - 400: パラメータ不正
 * - 404: 検索結果なし
 * - 500: システムエラー
 */
export const getEditItemData = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let response: GetEditItemDataResponse;

  try {
    // 1.パラメータチェック
    if (event.pathParameters === undefined) {
      throw new CustomError<GetDraftItemDataResult>({
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

    const params = event.pathParameters as GetDraftItemDataRequest['params'];
    const itemId = params?.itemId;
    if (!itemId || !ITEM_ID_PATTERN.test(itemId)) {
      throw new CustomError<GetDraftItemDataResult>({
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
    if (!ITEM_TYPE.includes(itemType)) {
      throw new CustomError<GetDraftItemDataResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: `不正なリクエスト`,
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

    // 2.検索処理
    const getItemDataResponse = await getItemData({
      itemType: itemType,
      itemState: 'draft',
      itemId: itemId,
    });
    if (!getItemDataResponse.body.success) {
      throw new CustomError<GetDraftItemDataResult>(getItemDataResponse);
    }

    // 編集モードの場合、閲覧数の更新はスキップ

    // レスポンス更新
    response = getItemDataResponse;
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

  // 4.レスポンス作成
  return convertLambdaResponse<GetDraftItemDataResult>()(response);
};
