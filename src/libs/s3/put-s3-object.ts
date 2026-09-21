import { PutObjectCommand } from '@aws-sdk/client-s3';
import { ApiResultBase } from '@magiarium/structure';
import { MAGIARIUM_BUCKET_NAME } from '../../constants';
import { ApiResponseBase } from '../../types/common';
import { s3Client } from './client';

/**
 * S3オブジェクト保存処理
 *
 * @param params.path 保存先パス
 * @param params.body 保存オブジェクト本体
 * @returns S3オブジェクト保存処理結果
 */
export const putS3Object = async ({
  path,
  body,
}: {
  path: string;
  body: string;
}): Promise<ApiResponseBase<ApiResultBase<undefined>>> => {
  try {
    const command = new PutObjectCommand({
      Bucket: MAGIARIUM_BUCKET_NAME,
      Key: path,
      Body: body,
    });
    await s3Client.send(command);
    return {
      statusCode: 200,
      body: {
        success: true,
        results: undefined,
      },
    };
  } catch {
    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          message: 'S3オブジェクト保存エラー',
          details: [
            {
              field: 'putS3Object',
              errorType: 'SYSTEM_ERROR',
              issue: `対象オブジェクトのアップロードに失敗しました。 path=[${path}].`,
            },
          ],
        },
      },
    };
  }
};
