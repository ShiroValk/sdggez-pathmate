import { Module } from '@nestjs/common';
import { MemoPathAuthController } from './auth.controller';
import { MemoPathAuthService } from './auth.service';
import { MemoPathElderController } from './elder.controller';
import { MemoPathElderService } from './elder.service';
import { MemoPathFamilyController } from './family.controller';
import { MemoPathFamilyService } from './family.service';

@Module({
  controllers: [MemoPathAuthController, MemoPathElderController, MemoPathFamilyController],
  providers: [MemoPathAuthService, MemoPathElderService, MemoPathFamilyService],
})
export class MemoPathModule {}
