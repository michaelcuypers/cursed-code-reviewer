// Authentication types for CryptKeeper Lambda

import type { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

export interface SoulUser {
  soulId: string;
  email: string;
  curseLevel?: number;
  totalScans?: number;
  createdAt: string;
  lastSeenAt: string;
}

export interface UserPreferences {
  defaultSeverity: 'minor' | 'moderate' | 'critical';
  autoFixEnabled: boolean;
  enabledRuleCategories: string[];
  theme: 'dark' | 'darker' | 'darkest';
}

export interface UserContext {
  user: SoulUser;
  preferences: UserPreferences;
}

export interface DynamoDBSoulRecord {
  PK: string;
  SK: string;
  entityType: 'Soul';
  soulId: string;
  email: string;
  createdAt: string;
  lastSeenAt: string;
  preferences: UserPreferences;
}

export type CryptKeeperAuthorizerEvent = APIGatewayTokenAuthorizerEvent;
export type CryptKeeperAuthorizerResult = APIGatewayAuthorizerResult;
