import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplicationLoginDto {
  @ApiProperty({
    example: 'app_uVxiPf2t6ku0TRmHIxzGH5Wk',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  clientId!: string;

  @ApiProperty({
    example: 'sk_your-client-secret',
    description:
      'Raw client secret issued when the application credential was generated.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  clientSecret!: string;
}