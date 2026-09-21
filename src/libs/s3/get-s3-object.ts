import {
  GetObjectCommand,
  GetObjectCommandOutput,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { ApiResultBase } from '@magiarium/structure';
import { MAGIARIUM_BUCKET_NAME } from '../../constants';
import { ApiResponseBase } from '../../types/common';
import { s3Client } from './client';

type GetS3ObjectResponse = ApiResponseBase<ApiResultBase<string>>;

/**
 * S3から対象パスのオブジェクトを取得する処理
 *
 * @param path 対象パス
 * @returns オブジェクト取得結果
 *
 * @remarks
 * - 200: 処理成功
 * - 400: パラメータ不正
 * - 500: 予期せぬエラー
 */
export const getS3Object = async (
  path: string
): Promise<GetS3ObjectResponse> => {
  try {
    const command = new GetObjectCommand({
      Bucket: MAGIARIUM_BUCKET_NAME,
      Key: path,
    });

    const response: GetObjectCommandOutput = await s3Client.send(command);

    if (!response.Body) {
      return {
        statusCode: 500,
        body: {
          success: false,
          error: {
            message: '対象オブジェクト取得エラー',
            details: [
              {
                field: `getS3Object`,
                errorType: 'BUSINESS_ERROR',
                issue: `対象オブジェクトのレスポンスボディが存在しません。bucketName=[${MAGIARIUM_BUCKET_NAME}], path=[${path}].`,
              },
            ],
          },
        },
      };
    }

    return {
      statusCode: 200,
      body: {
        success: true,
        results: await response.Body.transformToString(),
      },
    };
  } catch (error) {
    if (error instanceof NoSuchKey || (error as any)?.name === 'NoSuchKey') {
      return {
        statusCode: 404,
        body: {
          success: false,
          error: {
            message: '対象オブジェクト取得エラー',
            details: [
              {
                field: `getS3Object`,
                errorType: 'BUSINESS_ERROR',
                issue: `対象オブジェクトがS3バケットに存在しません。bucketName=[${MAGIARIUM_BUCKET_NAME}], path=[${path}].`,
              },
            ],
          },
        },
      };
    }
    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          message: '対象オブジェクト取得エラー',
          details: [
            {
              field: 'getS3Object',
              errorType: 'SYSTEM_ERROR',
              issue: `予期せぬエラー`,
            },
          ],
        },
      },
    };
  }
};
