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
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class ApiCredentialDto {
  @ApiPropertyOptional({
    description:
      'API key value when authType is API_KEY.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  value?: string;

  @ApiPropertyOptional({
    description:
      'Bearer token when authType is BEARER_TOKEN.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  token?: string;

  @ApiPropertyOptional({
    description:
      'Username when authType is BASIC_AUTH.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ApiPropertyOptional({
    description:
      'Password when authType is BASIC_AUTH.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  password?: string;
}

export class CreateApiIntegrationDto {
  @ApiProperty({
    example: 'Google Maps',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'Google Maps',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  provider!: string;

  @ApiProperty({
    example: 'https://maps.googleapis.com',
  })
  @IsString()
  @IsNotEmpty()
//   @IsUrl({
//     protocols: ['http', 'https'],
//     require_protocol: true,
//   })
    @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    })
  @MaxLength(500)
  baseUrl!: string;

  @ApiProperty({
    enum: [
      'NONE',
      'API_KEY',
      'BEARER_TOKEN',
      'BASIC_AUTH',
    ],
    example: 'API_KEY',
  })
  @IsIn([
    'NONE',
    'API_KEY',
    'BEARER_TOKEN',
    'BASIC_AUTH',
  ])
  authType!:
    | 'NONE'
    | 'API_KEY'
    | 'BEARER_TOKEN'
    | 'BASIC_AUTH';

  @ApiPropertyOptional({
    enum: ['HEADER', 'QUERY'],
    example: 'QUERY',
    description:
      'Required for API_KEY authentication.',
  })
  @IsOptional()
  @IsIn(['HEADER', 'QUERY'])
  credentialPlacement?: 'HEADER' | 'QUERY';

  @ApiPropertyOptional({
    example: 'key',
    description:
      'Header or query parameter name used for API_KEY authentication.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  credentialName?: string;

  @ApiPropertyOptional({
    type: ApiCredentialDto,
    description:
      'Provider credential. It is encrypted before being stored.',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ApiCredentialDto)
  credential?: ApiCredentialDto;
}