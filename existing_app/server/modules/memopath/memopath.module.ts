import { Module } from '@nestjs/common';
import { MemoPathAuthController } from './auth.controller';
import { MemoPathAuthService } from './auth.service';
import { MemoPathElderController } from './elder.controller';
import { MemoPathElderService } from './elder.service';
import { MemoPathFamilyController } from './family.controller';
import { MemoPathFamilyService } from './family.service';
import { MemoPathCareLinkController } from './care-link.controller';

@Module({
  controllers: [MemoPathAuthController, MemoPathElderController, MemoPathFamilyController, MemoPathCareLinkController],
  providers: [MemoPathAuthService, MemoPathElderService, MemoPathFamilyService],
})
export class MemoPathModule {}
