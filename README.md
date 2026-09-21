# 『まぎありうむ』バックエンドAPI

## 概要

個人ブログ『まぎありうむ』のバックエンドAPI用リポジトリです。

## API機能一覧

| 機能概要             | パス                             | HTTPメソッド | 認証    | クエリパラメータ                                       | ボディ     |
| -------------------- | -------------------------------- | ------------ | ------- | ------------------------------------------------------ | ---------- |
| データ削除           | /item/{itemType}/draft/{itemId}  | DELETE       | Cognito | —                                                      | —          |
| 下書きデータ一覧取得 | /item/{itemType}/draft           | GET          | Cognito | —                                                      | —          |
| 公開データ一覧取得   | /item/{itemType}/public          | GET          | -       | `orderBy`, `limit`, `lastEvaluatedKey`, <br> `itemIds` | —          |
| 下書きデータ取得     | /item/{itemType}/draft/{itemId}  | GET          | Cognito | —                                                      | —          |
| 公開データ取得       | /item/{itemType}/public/{itemId} | GET          | -       | —                                                      | —          |
| 下書きデータ保存     | /item/{itemType}/draft/{itemId}  | PUT          | Cognito | —                                                      | `itemData` |
| 下書きデータ公開     | /item/{itemType}/public/{itemId} | POST         | Cognito | —                                                      | —          |
| 閲覧数反映           | /sync/statistics                 | POST         | Cognito | —                                                      | —          |

### クエリパラメータ

| パラメータ       | 型     | 説明                                                                       | 例                                        |
| ---------------- | ------ | -------------------------------------------------------------------------- | ----------------------------------------- |
| orderBy          | string | 並び順                                                                     | "published_at_desc", "view_count_asc"     |
| limit            | number | 取得件数上限(DynamoDBの仕様的に上限100件)                                  | 10                                        |
| lastEvaluatedKey | string | 次ページ取得用カーソル。前回レスポンスの `lastEvaluatedKey` を指定します。 | `{"pk":"","sk":"","gsiPk":"","gsiSk":""}` |
| itemIds          | string | アイテムID一覧(,で複数指定可)                                              | "21120903000000, 21120903000001"          |

### リクエストボディ

`PUT /item/{itemType}/draft/{itemId}` では、リクエストボディに `itemData` を指定します。

| パラメータ | 型     | 説明               |
| ---------- | ------ | ------------------ |
| itemData   | object | アイテムデータ本体 |

### 補足

- 削除機能は下書きデータのみ対応しています。（今後、公開データの削除機能を実装する場合も論理削除）
- 下書きデータ取得では閲覧数のインクリメントは実施されません。（公開データ取得は閲覧数がインクリメント → 閲覧数反映処理でメタデータに本反映されます）
- 閲覧数反映処理のスケジューラーは、PROD環境のみデプロイされます。

## セットアップ

1. リポジトリをクローン

```bash
git clone https://github.com/magiarium/magiarium-api.git
```

2. パッケージをインストール

```basy
npm install
```

3. AWS CLIをインストール
   実際の手順は[AWS CLI公式ドキュメント](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)を参照。

4. AWS CLIの認証を設定
   下記コマンドで、デプロイ対象のAWSアカウントで認証出来ていることを確認してください。

   デプロイには、対象AWSアカウントに対するAWSリソース作成・更新権限 & SAMテンプレートでIAMリソースを作成するためのIAMリソースの作成権限 が必要です。

```bash
aws sts get-caller-identity
```

5. AWS SAMをインストール
   実際の手順は[AWS SAM公式ドキュメント](https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/serverless-getting-started.html)を参照。

6. Docker Desktopをインストール
   実際の手順は[Docker Desktop公式ドキュメント](https://www.docker.com/ja-jp/products/docker-desktop/)を参照

7. 必要に応じてIDEに拡張機能をインストール(下記はVSCodeの場合)

| 拡張機能名  | 用途                        |
| ----------- | --------------------------- |
| YAML        | template.yamlの編集時に利用 |
| AWS Toolkit | template.yamlの編集時に利用 |

## 使い方

### デプロイ

1. `samconfig.template.toml`の`CHANGE ME`を修正した後、ファイル名を`samconfig.toml`にリネームしてください。

※．コメントが残っているとエラーになるため注意

2. 下記コマンドで各環境にデプロイしてください。

- 開発環境

```bash
npm run  deploy:dev
```

- 本番環境

```bash
npm run deploy:prod
```

### ローカル実行

`.vscode/launch.json` に各Lambda関数のローカル実行設定を用意しています。

※１．SAM LocalではLambda実行環境としてDockerコンテナを使用するため、検証時はDocker Desktopを起動してください。

※２．検証用イベントは `events/` 配下に配置しています。リクエスト内容を変更する場合は、対象関数に対応するイベントファイルを修正してください。

※３．閲覧数同期処理のみSESを使用するため、`.vscode/launch.json`の`送信先/送信元メールアドレス`設定がダミーになっています。メールの受信を検証したい場合は`.vscode/launch.json`の記述を設定すればローカルから実行可能ですが、メールアドレス等を記載した修正ファイルを誤ってGitにPushしないように注意してください。

## 【補足】API起動について

API起動に必要なパラメータをSSM Parameter Storeで管理している都合上、現在ローカル環境でのAPI起動は対応しておりません。
動作確認をしたい場合、関数ごとのローカル実行を試すか、あるいはDEV環境にデプロイ→検証してください。

## その他コマンド

- 静的チェック・テンプレート検証

```bash
npm run check
```

※内部的に`prettier` + `lint` + `sam validate`を実施しています。個別にチェックしたい場合、`package.json`に定義している各種コマンドを使用してください。

- ビルド(node)

```bash
npm run node:build
```

- ビルド(sam)

```bash
npm run sam:build
```

- ビルド(node + sam)

```bash
npm run build
```

※安全のため、ビルド前に静的チェック・テンプレート検証コマンドが自動実行されます。(違反時はエラーとなり、ビルドに失敗します。)

## 関連リポジトリ

- [『まぎありうむ』インフラ用リポジトリ](https://github.com/magiarium/magiarium-infra)
- [『まぎありうむ』クライアント用リポジトリ](https://github.com/magiarium/magiarium-client)
- [『まぎありうむ』共通定義リポジトリ](https://github.com/magiarium/magiarium-structure)
