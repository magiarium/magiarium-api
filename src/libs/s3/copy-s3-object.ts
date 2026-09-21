import { CopyObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';
import { ApiResultBase } from '@magiarium/structure';
import { MAGIARIUM_BUCKET_NAME } from '../../constants';
import { ApiResponseBase } from '../../types/common';
import { s3Client } from './client';

/**
 * S3オブジェクトコピー処理
 *
 * @param params.fromPath コピー元オブジェクトパス
 * @param params.toPath コピー先オブジェクトパス
 * @returns S3オブジェクトコピー処理結果
 *
 * @remarks
 * - 200: 処理成功
 * - 404: コピー元オブジェクトが存在しないエラー
 * - 500: システムエラー
 */
export const copyS3Object = async ({
  fromPath,
  toPath,
}: {
  fromPath: string;
  toPath: string;
}): Promise<ApiResponseBase<ApiResultBase<undefined>>> => {
  try {
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: MAGIARIUM_BUCKET_NAME,
        CopySource: MAGIARIUM_BUCKET_NAME + '/' + fromPath,
        Key: toPath,
      })
    );
    return {
      statusCode: 200,
      body: {
        success: true,
        results: undefined,
      },
    };
  } catch (error) {
    if (
      error instanceof NoSuchKey ||
      (error instanceof Error && error.name === 'NoSuchKey')
    ) {
      return {
        statusCode: 404,
        body: {
          success: false,
          error: {
            message: 'S3オブジェクトコピーエラー',
            details: [
              {
                field: `copyS3Object`,
                errorType: 'BUSINESS_ERROR',
                issue: `対象オブジェクトがS3バケットに存在しません。path=[${fromPath}]`,
              },
            ],
          },
        },
      };
    }
    return {
      statusCode: 505,
      body: {
        success: false,
        error: {
          message: 'S3オブジェクトコピーエラー',
          details: [
            {
              field: `copyS3Object`,
              errorType: 'SYSTEM_ERROR',
              issue: `予期せぬエラー`,
            },
          ],
        },
      },
    };
  }
};
