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
import { ResourceUuidPipe } from './resource-uuid.pipe';

@UseGuards(MemoPathSessionGuard)
@Controller('api/memopath/elders')
export class MemoPathElderController {
  constructor(
    private readonly elderService: MemoPathElderService,
    private readonly familyService: MemoPathFamilyService,
  ) {}

  @Get()
  async list(@Req() req: MemoAuthedRequest): Promise<MemoPathElderListResponse> {
    const items: MemoPathElderRecord[] = await this.elderService.list(req.memoAccount);
    return { items };
  }

  @Post()
  async create(
    @Req() req: MemoAuthedRequest,
    @Body() dto: MemoPathElderInputDto,
  ): Promise<MemoPathElderRecord> {
    return this.elderService.create(req.memoAccount, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: MemoAuthedRequest,
    @Param('id', new ResourceUuidPipe()) id: string,
    @Body() dto: MemoPathElderUpdateDto,
  ): Promise<MemoPathElderRecord> {
    return this.elderService.update(req.memoAccount, id, dto);
  }

  @Delete(':id')
  async remove(
    @Req() req: MemoAuthedRequest,
    @Param('id', new ResourceUuidPipe()) id: string,
  ): Promise<MemoPathMessageResponse> {
    await this.elderService.remove(req.memoAccount, id);
    return { message: '已刪除' };
  }

  @Get(':id/contacts')
  async listContacts(
    @Req() req: MemoAuthedRequest,
    @Param('id', new ResourceUuidPipe()) id: string,
  ): Promise<MemoPathContactListResponse> {
    const items = await this.familyService.listContacts(req.memoAccount, id);
    return { items };
  }

  @Post(':id/contacts')
  async addContact(
    @Req() req: MemoAuthedRequest,
    @Param('id', new ResourceUuidPipe()) id: string,
    @Body() dto: MemoPathContactDto,
  ): Promise<MemoPathContactRecord> {
    return this.familyService.addContact(req.memoAccount, id, dto);
  }
}
