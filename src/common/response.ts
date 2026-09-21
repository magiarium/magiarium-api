import { APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponseBase } from '../types/common';

/**
 * Lambdaレスポンス変換処理
 *
 * @param response APIレスポンス情報
 * @returns Lambdaレスポンス
 */
export const convertLambdaResponse =
  <T>() =>
  (response: ApiResponseBase<T>): APIGatewayProxyResult => {
    return {
      statusCode: response.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response.body),
    };
  };
