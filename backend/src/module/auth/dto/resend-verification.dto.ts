import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'developer@example.com',
    description: 'Email address that needs a new verification link',
  })
  @IsEmail()
  email!: string;
}