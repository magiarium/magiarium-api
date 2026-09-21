import { SendEmailCommand } from '@aws-sdk/client-ses';
import { ApiResultBase } from '@magiarium/structure';
import { FROM_SYSTEM_MESSAGE_ADDRESS } from '../../constants';
import { ApiResponseBase } from '../../types/common';
import { sesClient } from './client';

type SendSystemMailResponse = ApiResponseBase<ApiResultBase<undefined>>;

/**
 * システムメール送信処理
 *
 * @param params.toAddresses 送信対象メールアドレスリスト
 * @param params.title タイトル
 * @param params.content メール本文
 * @return システムメール送信処理結果
 *
 * @remarks
 * - 200: 処理成功
 * - 500: システムエラー
 */
export const sendSystemMail = async ({
  toAddresses,
  title,
  content,
}: {
  toAddresses: string[];
  title: string;
  content: string;
}): Promise<SendSystemMailResponse> => {
  try {
    const params = {
      Source: `"[まぎありうむ]システム通知" <${FROM_SYSTEM_MESSAGE_ADDRESS}>`,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: title,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: content,
            Charset: 'UTF-8',
          },
        },
      },
    };
    await sesClient.send(new SendEmailCommand(params));
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
          message: 'メール送信処理エラー',
        },
      },
    };
  }
};
