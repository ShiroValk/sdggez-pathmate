/** Keep the public malformed-resource 404 contract without passing bad UUIDs
 * to PostgreSQL. Missing required query is 400; repeated/structured is 404.
 */
import { BadRequestException, NotFoundException, PipeTransform } from '@nestjs/common';
export function resourceUuid(value: unknown, optional = false): string | undefined {
  if (value === undefined || value === '') {
    if (optional && value === undefined) return undefined;
    throw new BadRequestException('缺少資源編號');
  }
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value)) throw new NotFoundException('資源不存在');
  return value;
}
export class ResourceUuidPipe implements PipeTransform {
  constructor(private readonly optional = false) {}
  transform(value: unknown) { return resourceUuid(value, this.optional); }
}
