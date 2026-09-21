import {
  GetItemDataRequest,
  GetItemDataResult,
  ITEM_ID_PATTERN,
  ITEM_TYPE,
} from '@magiarium/structure';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CustomError } from '../../common/custom-error';
import { convertLambdaResponse } from '../../common/response';
import { incrementViewCounts } from '../../libs/db/increment-view-counts';
import { getItemData } from '../../services/get-item-data';
import type { ApiResponseBase } from '../../types/common';

type GetPublicItemDataResponse = ApiResponseBase<GetItemDataResult>;

/**
 * 公開済みアイテム取得処理
 *
 * @param event API Gatewayから渡されるリクエストイベント
 * @returns アイテム検索結果を含むLambdaレスポンス
 *
 * @remarks
 * - 200: 処理成功
 * - 400: パラメータ不正
 * - 404: 検索結果なし
 * - 500: システムエラー
 */
export const getPublicItemData = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let response: GetPublicItemDataResponse;

  try {
    // 1.パラメータチェック
    if (event.pathParameters === undefined) {
      throw new CustomError<GetItemDataResult>({
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
    const params = event.pathParameters as GetItemDataRequest['params'];
    const itemId = params.itemId;
    if (itemId === undefined || !ITEM_ID_PATTERN.test(itemId)) {
      throw new CustomError<GetItemDataResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: `不正なリクエスト`,
            details: [
              {
                field: 'event.pathParameters.itemId',
                errorType: 'VALIDATION_ERROR',
                issue: `アイテムIDの形式が不正です。itemId=[${itemId}].`,
              },
            ],
          },
        },
      });
    }
    const itemType = params.itemType;
    if (!ITEM_TYPE.includes(itemType)) {
      throw new CustomError<GetItemDataResult>({
        statusCode: 400,
        body: {
          success: false,
          error: {
            message: `不正なリクエスト`,
            details: [
              {
                field: 'event.pathParameters.itemType',
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
      itemState: 'public', // 公開データ固定
      itemId: itemId,
    });
    if (!getItemDataResponse.body.success) {
      throw new CustomError<GetItemDataResult>(getItemDataResponse);
    }
    // 3.ビューカウント更新(失敗しても無害なので結果チェックは割愛)
    await incrementViewCounts({
      itemId: itemId,
      itemType: itemType,
    });
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
  return convertLambdaResponse<GetItemDataResult>()(response);
};
