import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  MemoPathContactListResponse,
  MemoPathContactRecord,
  MemoPathElderListResponse,
  MemoPathElderRecord,
  MemoPathMessageResponse,
} from '@shared/api.interface';
import { MemoPathElderService } from './elder.service';
import { MemoPathFamilyService } from './family.service';
import { MemoPathContactDto, MemoPathElderInputDto, MemoPathElderUpdateDto } from './dto';
import { MemoAuthedRequest, MemoPathSessionGuard } from './memopath-session.guard';

@UseGuards(MemoPathSessionGuard)
@Controller('api/memopath/elders')
export class MemoPathElderController {
  constructor(
    private readonly elderService: MemoPathElderService,
    private readonly familyService: MemoPathFamilyService,
  ) {}

  @Get()
  async list(@Req() req: MemoAuthedRequest): Promise<MemoPathElderListResponse> {
    const items: MemoPathElderRecord[] = await this.elderService.list(req.memoAccount.ownerId);
    return { items };
  }

  @Post()
  async create(
    @Req() req: MemoAuthedRequest,
    @Body() dto: MemoPathElderInputDto,
  ): Promise<MemoPathElderRecord> {
    return this.elderService.create(dto);
  }

  @Patch(':id')
  async update(
    @Req() req: MemoAuthedRequest,
    @Param('id') id: string,
    @Body() dto: MemoPathElderUpdateDto,
  ): Promise<MemoPathElderRecord> {
    return this.elderService.update(req.memoAccount.ownerId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Req() req: MemoAuthedRequest,
    @Param('id') id: string,
  ): Promise<MemoPathMessageResponse> {
    await this.elderService.remove(req.memoAccount.ownerId, id);
    return { message: '已刪除' };
  }

  @Get(':id/contacts')
  async listContacts(
    @Req() req: MemoAuthedRequest,
    @Param('id') id: string,
  ): Promise<MemoPathContactListResponse> {
    const items = await this.familyService.listContacts(req.memoAccount.ownerId, id);
    return { items };
  }

  @Post(':id/contacts')
  async addContact(
    @Req() req: MemoAuthedRequest,
    @Param('id') id: string,
    @Body() dto: MemoPathContactDto,
  ): Promise<MemoPathContactRecord> {
    return this.familyService.addContact(req.memoAccount.ownerId, id, dto);
  }
}
