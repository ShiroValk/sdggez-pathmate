import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  MemoPathAlertListResponse,
  MemoPathFamilyDashboardResponse,
  MemoPathGeofenceRecord,
  MemoPathMovementListResponse,
  MemoPathPlaceListResponse,
  MemoPathPlaceRecord,
  MemoPathSettingResponse,
  MemoPathTripListResponse,
  MemoPathTripRecord,
  MemoPathVitalSummaryResponse,
} from '@shared/api.interface';
import { MemoPathFamilyService } from './family.service';
import { MemoPathGeofenceDto, MemoPathPlaceDto, MemoPathSettingDto, MemoPathTripDto } from './dto';
import { MemoAuthedRequest, MemoPathSessionGuard } from './memopath-session.guard';

@UseGuards(MemoPathSessionGuard)
@Controller('api/memopath')
export class MemoPathFamilyController {
  constructor(private readonly familyService: MemoPathFamilyService) {}

  @Get('dashboard')
  async dashboard(
    @Req() req: MemoAuthedRequest,
    @Query('elderId') elderId?: string,
  ): Promise<MemoPathFamilyDashboardResponse> {
    return this.familyService.getDashboard(req.memoAccount.ownerId, elderId);
  }

  @Get('trips')
  async listTrips(
    @Req() req: MemoAuthedRequest,
    @Query('elderId') elderId?: string,
  ): Promise<MemoPathTripListResponse> {
    if (!elderId) {
      throw new BadRequestException('缺少 elderId');
    }
    const items: MemoPathTripRecord[] = await this.familyService.listTrips(
      req.memoAccount.ownerId,
      elderId,
    );
    return { items };
  }

  @Post('trips')
  async createTrip(
    @Req() req: MemoAuthedRequest,
    @Body() dto: MemoPathTripDto,
  ): Promise<MemoPathTripRecord> {
    return this.familyService.createTrip(req.memoAccount.ownerId, dto);
  }

  @Post('trips/:id/call')
  async callCab(
    @Req() req: MemoAuthedRequest,
    @Param('id') id: string,
  ): Promise<MemoPathTripRecord> {
    return this.familyService.callCab(req.memoAccount.ownerId, id);
  }

  @Get('settings')
  async getSetting(@Req() req: MemoAuthedRequest): Promise<MemoPathSettingResponse> {
    const config = await this.familyService.getSetting(req.memoAccount.ownerId);
    return { config };
  }

  @Put('settings')
  async saveSetting(
    @Req() req: MemoAuthedRequest,
    @Body() dto: MemoPathSettingDto,
  ): Promise<MemoPathSettingResponse> {
    const config = await this.familyService.saveSetting(req.memoAccount.ownerId, dto);
    return { config };
  }

  @Get('geofences/:elderId')
  async getGeofence(
    @Req() req: MemoAuthedRequest,
    @Param('elderId') elderId: string,
  ): Promise<MemoPathGeofenceRecord> {
    return this.familyService.getGeofence(req.memoAccount.ownerId, elderId);
  }

  @Put('geofences/:elderId')
  async saveGeofence(
    @Req() req: MemoAuthedRequest,
    @Param('elderId') elderId: string,
    @Body() dto: MemoPathGeofenceDto,
  ): Promise<MemoPathGeofenceRecord> {
    return this.familyService.saveGeofence(req.memoAccount.ownerId, elderId, dto);
  }

  @Get('places')
  async listPlaces(
    @Req() req: MemoAuthedRequest,
    @Query('elderId') elderId?: string,
  ): Promise<MemoPathPlaceListResponse> {
    if (!elderId) {
      throw new BadRequestException('缺少 elderId');
    }
    const items: MemoPathPlaceRecord[] = await this.familyService.listPlaces(
      req.memoAccount.ownerId,
      elderId,
    );
    return { items };
  }

  @Post('places')
  async addPlace(
    @Req() req: MemoAuthedRequest,
    @Body() dto: MemoPathPlaceDto,
  ): Promise<MemoPathPlaceRecord> {
    return this.familyService.addPlace(req.memoAccount.ownerId, dto);
  }

  @Get('alerts')
  async listAlerts(
    @Req() req: MemoAuthedRequest,
    @Query('elderId') elderId?: string,
  ): Promise<MemoPathAlertListResponse> {
    if (!elderId) {
      throw new BadRequestException('缺少 elderId');
    }
    const items = await this.familyService.listAlerts(req.memoAccount.ownerId, elderId);
    return { items };
  }

  @Get('vitals')
  async getVitals(
    @Req() req: MemoAuthedRequest,
    @Query('elderId') elderId?: string,
  ): Promise<MemoPathVitalSummaryResponse> {
    if (!elderId) {
      throw new BadRequestException('缺少 elderId');
    }
    return this.familyService.getVitalSummary(req.memoAccount.ownerId, elderId);
  }

  @Get('movements')
  async listMovements(
    @Req() req: MemoAuthedRequest,
    @Query('elderId') elderId?: string,
  ): Promise<MemoPathMovementListResponse> {
    if (!elderId) {
      throw new BadRequestException('缺少 elderId');
    }
    const items = await this.familyService.listMovements(req.memoAccount.ownerId, elderId);
    return { items };
  }
}
