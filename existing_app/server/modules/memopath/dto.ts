import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class MemoPathLoginDto {
  @IsString()
  @IsNotEmpty()
  account!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class MemoPathOtpDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class MemoPathElderInputDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  relation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(130)
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  avatarEmoji?: string;
}

export class MemoPathRegisterDto {
  @IsString()
  @IsNotEmpty()
  account!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsIn(['elder', 'family'])
  role!: 'elder' | 'family';

  @ValidateNested()
  @Type(() => MemoPathElderInputDto)
  elder!: MemoPathElderInputDto;
}

export class MemoPathElderUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  relation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(130)
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  avatarEmoji?: string;
}

export class MemoPathContactDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  relation?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarEmoji?: string;
}

export class MemoPathTripDto {
  @IsString()
  @IsNotEmpty()
  elderId!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  tripDate!: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  @IsIn(['auto', 'manual'])
  scheduleMode?: 'auto' | 'manual';
}

export class MemoPathSettingDto {
  @IsString()
  @IsIn(['mandarin', 'cantonese', 'english'])
  language!: 'mandarin' | 'cantonese' | 'english';

  @IsString()
  @IsIn(['default_on', 'standby'])
  voiceMode!: 'default_on' | 'standby';

  @IsBoolean()
  lockLayout!: boolean;
}

export class MemoPathGeofenceDto {
  @IsOptional()
  @IsString()
  homeLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  radiusM?: number;

  @IsOptional()
  @IsBoolean()
  dwellEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  dwellMinutes?: number;
}

export class MemoPathPlaceDto {
  @IsString()
  @IsNotEmpty()
  elderId!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  @IsIn(['frequent', 'beacon'])
  placeType?: 'frequent' | 'beacon';

  @IsOptional()
  @IsString()
  @IsIn(['safe', 'strange'])
  beaconStatus?: 'safe' | 'strange';

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsNumber()
  lat?: number;
}
