import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'email-verification-token',
    description: 'One-time email verification token',
  })
  @IsString()
  @MinLength(1)
  token: string;
}