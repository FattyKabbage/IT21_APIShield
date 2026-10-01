import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateApplicationDto {
  @ApiPropertyOptional({
    example: 'Acme Web Store',
    description: 'Application name.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Production ecommerce application',
    description:
      'Application description. Send null to remove the description.',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    enum: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
    example: 'PRODUCTION',
  })
  @IsOptional()
  @IsIn(['DEVELOPMENT', 'STAGING', 'PRODUCTION'])
  environment?: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'DISABLED'],
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';
}