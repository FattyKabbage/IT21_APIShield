import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RotateApplicationCredentialDto {
  @ApiProperty({
    description: 'Current password of the authenticated organization owner',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;
}

//expected na pass if mawala ang client id ug secret niay
