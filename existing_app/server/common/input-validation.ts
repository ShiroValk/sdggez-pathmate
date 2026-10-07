/** Preserve ordinary whitelist stripping, but reject forged authority fields
 * before transformation removes them. Applied recursively to JSON request DTOs;
 * the same principal remains server-owned regardless of unknown user fields.
 */
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
const forbidden = new Set(['owner', 'ownerId', 'ownerAccountId', 'owner_account_id', 'accountId', 'account_id', 'isDemo', 'is_demo', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt', '_created_by', '_updated_by', '_created_at', '_updated_at', 'sessionToken', 'sessionTokenHash', 'sessionExpiresAt', 'session_token_hash', 'session_expires_at', 'permissions', 'principal', '__proto__', 'constructor', 'prototype']);
function rejectAuthority(value: unknown, allowRegistrationRole = false): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (forbidden.has(key) || (key === 'role' && !allowRegistrationRole) || ['familyAccountId', 'elderAccountId', 'targetElderAccountId', 'codeHash'].includes(key)) throw new BadRequestException('請求不可設定身份、歸屬或權限欄位');
    rejectAuthority(nested);
  }
}
export class InputValidationPipe extends ValidationPipe {
  constructor() { super({ transform: true, whitelist: true, forbidUnknownValues: true }); }
  /** Body checks precede DTO transform; params/query retain their own contracts. */
  async transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type === 'body') rejectAuthority(value, metadata.metatype?.name === 'MemoPathRegisterDto');
    return super.transform(value, metadata);
  }
}
