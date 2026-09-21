import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DYNAMODB_END_POINT } from '../../constants';

const dynamoDBClient = new DynamoDBClient({ endpoint: DYNAMODB_END_POINT });

export const dynamoDBDocumentClient =
  DynamoDBDocumentClient.from(dynamoDBClient);
