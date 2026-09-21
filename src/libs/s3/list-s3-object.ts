import {
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import { ApiResultBase } from '@magiarium/structure';
import { MAGIARIUM_BUCKET_NAME } from '../../constants';
import { ApiResponseBase } from '../../types/common';
import { s3Client } from './client';

type ListS3ObjectResponse = ApiResponseBase<ApiResultBase<string[]>>;

/**
 * S3オブジェクト一覧取得処理
 *
 * @param path 対象パス
 * @returns オブジェクト一覧取得処理結果
 *
 * @remarks
 * - 200: 処理成功
 * - 404: 検索結果なし
 * - 500: 予期せぬエラー
 */
export const listS3Object = async (
  path: string
): Promise<ListS3ObjectResponse> => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: MAGIARIUM_BUCKET_NAME,
      Prefix: path,
    });

    const response: ListObjectsV2CommandOutput = await s3Client.send(command);
    if (!response?.Contents) {
      return {
        statusCode: 404,
        body: {
          success: false,
          error: {
            message: '対象オブジェクトの取得に失敗しました。',
            details: [
              {
                field: `listS3Object`,
                errorType: 'BUSINESS_ERROR',
                issue: `対象オブジェクトがS3バケットに存在しません。bucketName=[${MAGIARIUM_BUCKET_NAME}], path=[${path}].`,
              },
            ],
          },
        },
      };
    }

    const results = response.Contents.map((value) => value.Key).filter(
      (key): key is string => key !== undefined
    );

    return {
      statusCode: 200,
      body: {
        success: true,
        results: results,
      },
    };
  } catch {
    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          message: '対象オブジェクトの取得に失敗しました。',
          details: [
            {
              field: 'listS3Object',
              errorType: 'SYSTEM_ERROR',
              issue: '予期せぬエラー',
            },
          ],
        },
      },
    };
  }
};
