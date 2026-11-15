import {
  type KeySchemaElement,
  type AttributeDefinition,
  type GlobalSecondaryIndex,
} from "@aws-sdk/client-dynamodb";

export const TableName = {
  SERVICES: "services",
  ACCOUNTS: "accounts",
  TRADES: "trades",
  DEPOSITS: "deposits",
  WITHDRAWALS: "withdrawals",
  PROMO_CODES: "promo_codes",
  BONUS_ACTIVATIONS: "bonus_activations",
  SETTINGS: "settings",
  ADMIN_AUDIT_LOG: "admin_audit_log",
  SUPPORT_TICKETS: "support_tickets",
} as const;

export type TableName = (typeof TableName)[keyof typeof TableName];

export interface TableSchema {
  name: TableName;
  keySchema: KeySchemaElement[];
  attributeDefinitions: AttributeDefinition[];
  globalSecondaryIndexes?: GlobalSecondaryIndex[];
}

export const TABLE_SCHEMAS: Record<TableName, TableSchema> = {
  [TableName.SERVICES]: {
    name: TableName.SERVICES,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
    ],
    globalSecondaryIndexes: [
      {
        IndexName: "status-index",
        KeySchema: [{ AttributeName: "status", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
  [TableName.ACCOUNTS]: {
    name: TableName.ACCOUNTS,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
  },
  [TableName.TRADES]: {
    name: TableName.TRADES,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "accountId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    globalSecondaryIndexes: [
      {
        IndexName: "account-index",
        KeySchema: [
          { AttributeName: "accountId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
  [TableName.DEPOSITS]: {
    name: TableName.DEPOSITS,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "accountId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    globalSecondaryIndexes: [
      {
        IndexName: "deposits-account-index",
        KeySchema: [
          { AttributeName: "accountId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
  [TableName.WITHDRAWALS]: {
    name: TableName.WITHDRAWALS,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "accountId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    globalSecondaryIndexes: [
      {
        IndexName: "withdrawals-account-index",
        KeySchema: [
          { AttributeName: "accountId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
  [TableName.PROMO_CODES]: {
    name: TableName.PROMO_CODES,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
  },
  [TableName.BONUS_ACTIVATIONS]: {
    name: TableName.BONUS_ACTIVATIONS,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "accountId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    globalSecondaryIndexes: [
      {
        IndexName: "bonus-activations-account-index",
        KeySchema: [
          { AttributeName: "accountId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
  [TableName.SETTINGS]: {
    name: TableName.SETTINGS,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
  },
  [TableName.ADMIN_AUDIT_LOG]: {
    name: TableName.ADMIN_AUDIT_LOG,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
  },
  [TableName.SUPPORT_TICKETS]: {
    name: TableName.SUPPORT_TICKETS,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "accountId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    globalSecondaryIndexes: [
      {
        IndexName: "support-account-index",
        KeySchema: [
          { AttributeName: "accountId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
};

export const TABLE_NAMES: TableName[] = Object.values(TableName);

export const IndexName = {
  SERVICES_STATUS: "status-index",
  TRADES_ACCOUNT: "account-index",
  DEPOSITS_ACCOUNT: "deposits-account-index",
  WITHDRAWALS_ACCOUNT: "withdrawals-account-index",
  BONUS_ACTIVATIONS_ACCOUNT: "bonus-activations-account-index",
  SUPPORT_ACCOUNT: "support-account-index",
} as const;

export type IndexName = (typeof IndexName)[keyof typeof IndexName];
