import { ZeroPadNumber } from './types/common';

/**
 * ゼロ埋め処理
 *
 * @param params.number ゼロ埋め対象値
 * @param params.digits ゼロ埋めする桁数
 * @returns 指定桁数までゼロ埋めした値
 */
export const toZeroPadNumber = ({
  number,
  digits = 10,
}: {
  number: number;
  digits?: number;
}): ZeroPadNumber => {
  const strNumber = String(number);
  return (
    strNumber.length >= digits
      ? strNumber
      : '0'.repeat(digits - strNumber.length) + strNumber
  ) as ZeroPadNumber;
};

/**
 * 文字列を正の整数にパースする
 *
 * @param value 文字列
 * @param defaultValue パースに失敗した場合のデフォルト値
 * @returns 変換した正の整数値、またはデフォルト値
 */
export const parsePositiveInt = (value?: string, defaultValue = 0): number => {
  const parsed = parseInt(value ?? '', 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return parsed;
};
