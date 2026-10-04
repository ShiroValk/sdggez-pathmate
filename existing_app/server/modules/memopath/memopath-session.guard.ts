import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { memopathAccount } from '@server/database/schema';

export interface MemoAccountSession {
  accountId: string;
  accountKey: string;
  role: string;
  displayName: string;
  ownerId: string;
}

export interface MemoAuthedRequest {
  memoAccount: MemoAccountSession;
}

@Injectable()
export class MemoPathSessionGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const token: string | string[] | undefined = req.headers['x-memopath-token'];
    if (!token || typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('請先登入');
    }
    const rows = await this.db
      .select()
      .from(memopathAccount)
      .where(eq(memopathAccount.sessionToken, token))
      .limit(1);
    const account = rows[0];
    if (!account) {
      throw new UnauthorizedException('登入已過期，請重新登入');
    }
    (req as { memoAccount?: MemoAccountSession }).memoAccount = {
      accountId: account.id,
      accountKey: account.accountKey,
      role: account.role,
      displayName: account.displayName,
      ownerId: account.createdBy ?? '',
    };
    return true;
  }
}
