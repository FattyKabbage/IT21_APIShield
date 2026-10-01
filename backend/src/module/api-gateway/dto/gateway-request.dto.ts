import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class GatewayRequestDto {
  @ApiProperty({
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    example: 'GET',
  })
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method!: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  @ApiProperty({
    example: '/maps/api/geocode/json',
    description: 'Relative provider path. Absolute URLs are not allowed.',
  })
  @IsString()
  @MaxLength(1000)
  path!: string;

  @ApiPropertyOptional({
    example: {
      address: 'Davao City',
    },
  })
  @IsOptional()
  @IsObject()
  query?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: {
      accept: 'application/json',
    },
    description: 'Optional provider request headers. Sensitive transport/authentication headers are blocked.',
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: {
      amount: 1000,
    },
    description: 'Optional JSON request body.',
  })
  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;
}