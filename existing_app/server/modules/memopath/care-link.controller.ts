/** Six additive consent endpoints delegate lifecycle/authorization to Elder.
 * Codes are JSON-body only and returned once, never included in resource URLs.
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { MemoPathCareAcceptDto, MemoPathCareCodeDto, MemoPathCareInviteDto } from './dto';
import { MemoPathElderService } from './elder.service';
import { MemoAuthedRequest, MemoPathSessionGuard } from './memopath-session.guard';
import { ResourceUuidPipe, resourceUuid } from './resource-uuid.pipe';
@UseGuards(MemoPathSessionGuard)
@Controller('api/memopath/care-links')
export class MemoPathCareLinkController {
  constructor(private readonly elderService: MemoPathElderService) {}
  @Post('invitations')
  invite(@Req() req: MemoAuthedRequest, @Body() dto: MemoPathCareInviteDto) {
    resourceUuid(dto.elderId); return this.elderService.invite(req.memoAccount, dto.elderId, dto.elderAccount);
  }
  @Post('invitations/preview') @HttpCode(200)
  preview(@Req() req: MemoAuthedRequest, @Body() dto: MemoPathCareCodeDto) { return this.elderService.preview(req.memoAccount, dto.code); }
  @Post('accept')
  accept(@Req() req: MemoAuthedRequest, @Body() dto: MemoPathCareAcceptDto) { return this.elderService.accept(req.memoAccount, dto.code); }
  @Get()
  async list(@Req() req: MemoAuthedRequest) { return { items: await this.elderService.links(req.memoAccount) }; }
  @Delete('invitations/:id')
  async revokeInvitation(@Req() req: MemoAuthedRequest, @Param('id', new ResourceUuidPipe()) id: string) {
    await this.elderService.revokeInvitation(req.memoAccount, id); return { message: '邀請已撤銷' };
  }
  @Delete(':id')
  async revoke(@Req() req: MemoAuthedRequest, @Param('id', new ResourceUuidPipe()) id: string) {
    await this.elderService.revokeLink(req.memoAccount, id); return { message: '關聯已撤銷' };
  }
}
