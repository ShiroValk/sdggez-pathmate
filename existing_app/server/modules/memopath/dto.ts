import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  ValidateIf,
  IsDefined,
  IsObject,
  MaxLength,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
  Equals,
  registerDecorator,
} from 'class-validator';

/** Real date validation, including leap days; regex alone accepts February 30. */
function CalendarDate() {
  return (object: object, propertyName: string) => registerDecorator({
    name: 'calendarDate', target: object.constructor, propertyName,
    validator: { validate(value: unknown) {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value) || value.startsWith('0000-')) return false;
      const date = new Date(value + 'T00:00:00.000Z');
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    } },
  });
}
/** Both nonempty times must describe a same-day interval. */
function OrderedTimes() {
  return (object: object, propertyName: string) => registerDecorator({
    name: 'orderedTimes', target: object.constructor, propertyName,
    validator: { validate(_value: unknown, args) {
      const dto = args!.object as MemoPathTripDto;
      return !dto.startTime || !dto.endTime || dto.endTime >= dto.startTime;
    } },
  });
}

export class MemoPathLoginDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(64)
  account!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

export class MemoPathOtpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[0-9+ ()-]*$/u)
  phone!: string;
}

export class MemoPathElderInputDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(100)
  name!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  relation?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(130)
  age?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  address?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(32)
  @Matches(/^[0-9+ ()-]*$/u)
  phone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(32)
  @Matches(/^[0-9+ ()-]*$/u)
  emergencyPhone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(16)
  avatarEmoji?: string;
}

export class MemoPathRegisterDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(64)
  account!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsIn(['elder', 'family'])
  role!: 'elder' | 'family';

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MemoPathElderInputDto)
  elder!: MemoPathElderInputDto;
}

export class MemoPathElderUpdateDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(100)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  relation?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(130)
  age?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  address?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(32)
  @Matches(/^[0-9+ ()-]*$/u)
  phone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(32)
  @Matches(/^[0-9+ ()-]*$/u)
  emergencyPhone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(16)
  avatarEmoji?: string;
}

export class MemoPathContactDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(100)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  name!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  relation?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(32)
  @Matches(/^[0-9+ ()-]*$/u)
  phone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(16)
  avatarEmoji?: string;
}

export class MemoPathTripDto {
  @IsString()
  @IsNotEmpty()
  elderId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  destination!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  @CalendarDate()
  @OrderedTimes()
  tripDate!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(8)
  @Matches(/^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/u)
  startTime?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(8)
  @Matches(/^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/u)
  endTime?: string;

  @ValidateIf((_object, value) => value !== undefined)
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
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  homeLabel?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(100)
  @Max(5000)
  radiusM?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  dwellEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
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
  @MaxLength(100)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  label!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(16)
  icon?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsIn(['frequent', 'beacon'])
  placeType?: 'frequent' | 'beacon';

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsIn(['safe', 'strange'])
  beaconStatus?: 'safe' | 'strange';

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  address?: string;

  @ValidateIf((object, value) => value !== undefined || object.lat !== undefined)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ValidateIf((object, value) => value !== undefined || object.lng !== undefined)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;
}

/** Patch for an existing place; ownership is resolved from the locked row. */
export class MemoPathPlaceUpdateDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @IsNotEmpty() @MaxLength(100)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  label?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @MaxLength(16)
  icon?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @IsIn(['frequent', 'beacon'])
  placeType?: 'frequent' | 'beacon';

  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @IsIn(['safe', 'strange'])
  beaconStatus?: 'safe' | 'strange';

  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @MaxLength(255)
  address?: string;

  @ValidateIf((object, value) => value !== undefined || object.lat !== undefined)
  @IsNumber() @Min(-180) @Max(180)
  lng?: number;

  @ValidateIf((object, value) => value !== undefined || object.lng !== undefined)
  @IsNumber() @Min(-90) @Max(90)
  lat?: number;
}

/** Care codes remain body-only; no lookup by guessed identity grants access. */
export class MemoPathCareInviteDto {
  @IsString() @IsNotEmpty() elderId!: string;
  @IsString() @IsNotEmpty() @MaxLength(64)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  elderAccount!: string;
}
export class MemoPathCareCodeDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/u) code!: string;
}
export class MemoPathCareAcceptDto extends MemoPathCareCodeDto {
  @IsBoolean() @Equals(true) confirm!: boolean;
}
