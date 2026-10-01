import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    example: 'organization-invitation-token',
    description: 'One-time organization invitation token',
  })
  @IsString()
  @MinLength(1)
  token: string;
}