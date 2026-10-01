import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiCredentialDto } from './create-api-integration.dto.js';

export class UpdateApiIntegrationDto {
  @ApiPropertyOptional({
    example: 'Google Maps Production',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Google Maps',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  provider?: string;

  @ApiPropertyOptional({
    example: 'https://maps.googleapis.com',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
  })
  @MaxLength(500)
  baseUrl?: string;

  @ApiPropertyOptional({
    enum: [
      'NONE',
      'API_KEY',
      'BEARER_TOKEN',
      'BASIC_AUTH',
    ],
  })
  @IsOptional()
  @IsIn([
    'NONE',
    'API_KEY',
    'BEARER_TOKEN',
    'BASIC_AUTH',
  ])
  authType?:
    | 'NONE'
    | 'API_KEY'
    | 'BEARER_TOKEN'
    | 'BASIC_AUTH';

  @ApiPropertyOptional({
    enum: ['HEADER', 'QUERY'],
  })
  @IsOptional()
  @IsIn(['HEADER', 'QUERY'])
  credentialPlacement?: 'HEADER' | 'QUERY';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  credentialName?: string;

  @ApiPropertyOptional({
    type: ApiCredentialDto,
    description:
      'Provide this only when setting or replacing the provider credential.',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ApiCredentialDto)
  credential?: ApiCredentialDto;

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'DISABLED'],
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';
}