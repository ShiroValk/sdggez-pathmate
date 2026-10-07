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
import { ResourceUuidPipe, resourceUuid } from './resource-uuid.pipe';

@UseGuards(MemoPathSessionGuard)
@Controller('api/memopath')
export class MemoPathFamilyController {
  constructor(private readonly familyService: MemoPathFamilyService) {}

  @Get('dashboard')
  async dashboard(
    @Req() req: MemoAuthedRequest,
    @Query('elderId', new ResourceUuidPipe(true)) elderId?: string,
  ): Promise<MemoPathFamilyDashboardResponse> {
    return this.familyService.getDashboard(req.memoAccount, elderId);
  }

  @Get('trips')
  async listTrips(
    @Req() req: MemoAuthedRequest,
    @Query('elderId', new ResourceUuidPipe()) elderId?: string,
  ): Promise<MemoPathTripListResponse> {
    if (!elderId) {
      throw new BadRequestException('缺少 elderId');
    }
    const items: MemoPathTripRecord[] = await this.familyService.listTrips(
      req.memoAccount,
      elderId,
    );
    return { items };
  }

  @Post('trips')
  async createTrip(
    @Req() req: MemoAuthedRequest,
    @Body() dto: MemoPathTripDto,
  ): Promise<MemoPathTripRecord> {
    resourceUuid(dto.elderId);
    return this.familyService.createTrip(req.memoAccount, dto);
  }

  @Post('trips/:id/call')
  async callCab(
    @Req() req: MemoAuthedRequest,
    @Param('id', new ResourceUuidPipe()) id: string,
  ): Promise<MemoPathTripRecord> {
    return this.familyService.callCab(req.memoAccount, id);
  }

  @Get('settings')
  async getSetting(@Req() req: MemoAuthedRequest): Promise<MemoPathSettingResponse> {
    const config = await this.familyService.getSetting(req.memoAccount);
    return { config };
  }

  @Put('settings')
  async saveSetting(
    @Req() req: MemoAuthedRequest,
    @Body() dto: MemoPathSettingDto,
  ): Promise<MemoPathSettingResponse> {
    const config = await this.familyService.saveSetting(req.memoAccount, dto);
    return { config };
  }

  @Get('geofences/:elderId')
  async getGeofence(
    @Req() req: MemoAuthedRequest,
    @Param('elderId', new ResourceUuidPipe()) elderId: string,
  ): Promise<MemoPathGeofenceRecord> {
    return this.familyService.getGeofence(req.memoAccount, elderId);
  }

  @Put('geofences/:elderId')
  async saveGeofence(
    @Req() req: MemoAuthedRequest,
    @Param('elderId', new ResourceUuidPipe()) elderId: string,
    @Body() dto: MemoPathGeofenceDto,
  ): Promise<MemoPathGeofenceRecord> {
    return this.familyService.saveGeofence(req.memoAccount, elderId, dto);
  }

  @Get('places')
  async listPlaces(
    @Req() req: MemoAuthedRequest,
    @Query('elderId', new ResourceUuidPipe()) elderId?: string,
  ): Promise<MemoPathPlaceListResponse> {
    if (!elderId) {
      throw new BadRequestException('缺少 elderId');
    }
    const items: MemoPathPlaceRecord[] = await this.familyService.listPlaces(
      req.memoAccount,
      elderId,
    );
    return { items };
  }

  @Post('places')
  async addPlace(
    @Req() req: MemoAuthedRequest,
    @Body() dto: MemoPathPlaceDto,
  ): Promise<MemoPathPlaceRecord> {
    resourceUuid(dto.elderId);
    return this.familyService.addPlace(req.memoAccount, dto);
  }

  @Get('alerts')
  async listAlerts(
    @Req() req: MemoAuthedRequest,
    @Query('elderId', new ResourceUuidPipe()) elderId?: string,
  ): Promise<MemoPathAlertListResponse> {
    if (!elderId) {
      throw new BadRequestException('缺少 elderId');
    }
    const items = await this.familyService.listAlerts(req.memoAccount, elderId);
    return { items };
  }

  @Get('vitals')
  async getVitals(
    @Req() req: MemoAuthedRequest,
    @Query('elderId', new ResourceUuidPipe()) elderId?: string,
  ): Promise<MemoPathVitalSummaryResponse> {
    if (!elderId) {
      throw new BadRequestException('缺少 elderId');
    }
    return this.familyService.getVitalSummary(req.memoAccount, elderId);
  }

  @Get('movements')
  async listMovements(
    @Req() req: MemoAuthedRequest,
    @Query('elderId', new ResourceUuidPipe()) elderId?: string,
  ): Promise<MemoPathMovementListResponse> {
    if (!elderId) {
      throw new BadRequestException('缺少 elderId');
    }
    const items = await this.familyService.listMovements(req.memoAccount, elderId);
    return { items };
  }
}
