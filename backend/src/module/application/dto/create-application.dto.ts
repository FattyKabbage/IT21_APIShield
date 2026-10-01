import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    example: 'Acme Web Store',
    description: 'Unique application name within the organization.',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Main ecommerce application',
    description: 'Optional application description.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    enum: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
    default: 'DEVELOPMENT',
    example: 'DEVELOPMENT',
  })
  @IsOptional()
  @IsIn(['DEVELOPMENT', 'STAGING', 'PRODUCTION'])
  environment?: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
}