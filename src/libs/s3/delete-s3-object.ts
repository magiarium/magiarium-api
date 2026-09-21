import { DeleteObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';
import { ApiResultBase } from '@magiarium/structure';
import { MAGIARIUM_BUCKET_NAME } from '../../constants';
import { ApiResponseBase } from '../../types/common';
import { s3Client } from './client';

/**
 * S3オブジェクト削除処理
 *
 * @param path オブジェクトのパス
 * @returns オブジェクト削除処理結果
 *
 * @remarks
 * - 200: 処理成功
 * - 404: 対象オブジェクトが存在しないエラー
 * - 500: 予期せぬエラー
 */
export const deleteS3Object = async (
  path: string
): Promise<ApiResponseBase<ApiResultBase<undefined>>> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: MAGIARIUM_BUCKET_NAME,
      Key: path,
    });

    await s3Client.send(command);

    return {
      statusCode: 200,
      body: {
        success: true,
        results: undefined,
      },
    };
  } catch (error) {
    if (error instanceof NoSuchKey || (error as any)?.name === 'NoSuchKey') {
      return {
        statusCode: 404,
        body: {
          success: false,
          error: {
            message: '対象オブジェクトの削除に失敗しました。',
            details: [
              {
                field: 'deleteS3Object',
                errorType: 'BUSINESS_ERROR',
                issue: `対象オブジェクトがS3バケットに存在しません。path=[${path}]`,
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
          message: '対象オブジェクトの削除に失敗しました。',
          details: [
            {
              field: 'deleteS3Object',
              errorType: 'SYSTEM_ERROR',
              issue: '予期せぬエラー',
            },
          ],
        },
      },
    };
  }
};
