import { ApiResultBase, ErrorDetail, ITEM_TYPE } from '@magiarium/structure';
import { APIGatewayProxyResult } from 'aws-lambda';
import { CustomError } from '../../common/custom-error';
import { convertLambdaResponse } from '../../common/response';
import { TO_SYSTEM_MESSAGE_ADDRESS } from '../../constants';
import { getItemStatisticsAll } from '../../libs/db/get-item-statistics-all';
import { sendSystemMail } from '../../libs/ses/send-system-mail';
import { syncViewCountToMetadata } from '../../services/sync-view-count-to-metadata';
import { ApiResponseBase, ItemStaticsInfo } from '../../types/common';

type SyncViewCountsResult = ApiResultBase<undefined>;

type SyncViewCountsResponse = ApiResponseBase<SyncViewCountsResult>;

/**
 * 閲覧数同期処理
 *
 * @param event API Gatewayから渡されるリクエストイベント
 * @returns 閲覧数同期処理結果を含むLambdaレスポンス
 *
 * @remarks
 * - 200: 処理成功
 * - 400: パラメータ不正
 * - 500: システムエラー
 */
export const syncViewCount = async (): Promise<APIGatewayProxyResult> => {
  let response: SyncViewCountsResponse;
  const updatedItems: ItemStaticsInfo[] = [];
  const failureItems: ErrorDetail[] = [];
  try {
    for (const itemType of ITEM_TYPE) {
      if (!ITEM_TYPE.includes(itemType)) {
        throw new CustomError<SyncViewCountsResult>({
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
      // DynamoDBから統計情報（ビューカウント）を全件取得
      const getItemStatisticsAllResponse = await getItemStatisticsAll(itemType);
      if (!getItemStatisticsAllResponse.body.success) {
        throw new CustomError<SyncViewCountsResult>({
          statusCode: getItemStatisticsAllResponse.statusCode,
          body: getItemStatisticsAllResponse.body,
        });
      }

      // 各メタデータに対して最新のビューカウントを反映
      const syncViewCountToMetadataResponse = await syncViewCountToMetadata(
        getItemStatisticsAllResponse.body.results
      );
      if (!syncViewCountToMetadataResponse.body.success) {
        throw new CustomError<SyncViewCountsResult>({
          statusCode: syncViewCountToMetadataResponse.statusCode,
          body: syncViewCountToMetadataResponse.body,
        });
      }
      // 結果更新
      updatedItems.push(
        ...syncViewCountToMetadataResponse.body.results.updated
      );
      failureItems.push(
        ...syncViewCountToMetadataResponse.body.results.failures
      );
    }
    // 結果通知
    await sendSystemMail({
      toAddresses: [TO_SYSTEM_MESSAGE_ADDRESS],
      title: '[バッチ処理完了通知]',
      content: `ビューカウントの更新処理が完了しました。（更新成功）\n【更新対象一覧】\n${JSON.stringify(updatedItems)}`,
    });
    if (failureItems.length !== 0) {
      throw new CustomError<SyncViewCountsResult>({
        statusCode: 500,
        body: {
          success: false,
          error: {
            message: '一部アイテムの閲覧数更新に失敗しました。',
            details: failureItems,
          },
        },
      });
    }
    // 全件成功した場合のみ成功扱い
    response = {
      statusCode: 200,
      body: {
        success: true,
        results: undefined,
      },
    };
  } catch (error) {
    await sendSystemMail({
      toAddresses: [TO_SYSTEM_MESSAGE_ADDRESS],
      title: '[バッチ処理完了通知]',
      content: `ビューカウントの更新処理が完了しました。（更新失敗）\n【更新失敗対象一覧】\n${JSON.stringify(failureItems)}`,
    });
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
    // EventBridge的に失敗扱いにするため、レスポンスではなく例外を投げる
    throw Error('更新処理に失敗しました。詳細はメールを確認してください。');
  }
  return convertLambdaResponse<SyncViewCountsResult>()(response);
};
