import { ApiResultBase, ItemId, ItemType } from '@magiarium/structure';
import { listS3Object } from '../libs/s3/list-s3-object';
import { ApiResponseBase } from '../types/common';

type GetResourceListResult = ApiResultBase<string[]>;

type GetRresourceListResponce = ApiResponseBase<GetResourceListResult>;

/**
 * アイテムデータのリソース一覧取得処理
 *
 * @param params.itemId アイテムID
 * @param params.itemType アイテム種別
 * @returns リソース一覧取得処理結果
 *
 * @remarks
 * - 200: 処理成功
 * - 500: 予期せぬエラー
 */
export const getItemDataResourceList = async ({
  itemId,
  itemType,
}: {
  itemId: ItemId;
  itemType: ItemType;
}): Promise<GetRresourceListResponce> => {
  // 編集中アイテムのリソース一覧を取得
  const listS3ObjectResponse = await listS3Object(
    `items/${itemId}/draft/${itemType}/resources/`
  );
  // リソースが一つもない場合、結果0件で202扱いにする
  if (listS3ObjectResponse.statusCode === 404) {
    return {
      statusCode: 200,
      body: {
        success: true,
        results: [],
      },
    };
  }
  if (!listS3ObjectResponse.body.success) {
    return {
      statusCode: listS3ObjectResponse.statusCode,
      body: {
        success: false,
        error: listS3ObjectResponse.body.error,
      },
    };
  }

  const results = listS3ObjectResponse.body.results.map((targetObject) =>
    targetObject.replace(`items/${itemId}/draft/${itemType}/resources/`, '')
  );

  return {
    statusCode: 200,
    body: {
      success: true,
      results,
    },
  };
};
