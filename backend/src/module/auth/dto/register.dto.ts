import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'developer@example.com',
    description: 'Email address for the new account',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongPassword123',
    description: 'Password for the new account',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @ApiProperty({
    enum: ['ORGANIZATION', 'DEVELOPER'],
    example: 'DEVELOPER',
    description: 'Type of account to register',
  })
  @IsIn(['ORGANIZATION', 'DEVELOPER'])
  type: 'ORGANIZATION' | 'DEVELOPER';

  @ApiPropertyOptional({
    example: 'Acme Corporation',
    description: 'Organization name, required when registering an organization',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  organizationName?: string;
}