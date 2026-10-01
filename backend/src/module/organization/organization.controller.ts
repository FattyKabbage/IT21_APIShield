import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { OrganizationService } from './organization.service.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles/roles.guard.js';
import { Roles } from '../../common/decorators/roles/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user/current-user.decorator.js';

@ApiTags('Organization')
@ApiBearerAuth()
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Get()
  @ApiOperation({ summary: 'Get the authenticated organization' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the ORGANIZATION role.' })
  @ApiNotFoundResponse({ description: 'User or organization not found.' })
  getOrganization(@CurrentUser() user: { sub: string }) {
    return this.organizationService.getOrganization(user.sub);
  }

  @UseGuards(ThrottlerGuard, JwtAuthGuard, RolesGuard)
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @Roles('ORGANIZATION')
  @Post('invitations')
  @ApiOperation({ summary: 'Invite a developer to the organization' })
  @ApiBadRequestResponse({ description: 'Invalid invitation request.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the ORGANIZATION role.' })
  @ApiConflictResponse({ description: 'Developer already belongs to the organization or an active invitation already exists.' })
  createInvitation(@CurrentUser() user: { sub: string }, @Body() dto: CreateInvitationDto) {
    return this.organizationService.createInvitation(user.sub, dto);
  }

  @UseGuards(ThrottlerGuard, JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept an organization invitation' })
  @ApiBadRequestResponse({ description: 'Invalid invitation request.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Invitation does not belong to the authenticated developer.' })
  @ApiNotFoundResponse({ description: 'Invitation not found.' })
  @ApiConflictResponse({ description: 'Invitation is expired, unavailable, or developer already belongs to an organization.' })
  acceptInvitation(@CurrentUser() user: { sub: string }, @Body() dto: AcceptInvitationDto) {
    return this.organizationService.acceptInvitation(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Get('members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the ORGANIZATION role.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  getMembers(@CurrentUser() user: { sub: string }) {
    return this.organizationService.getMembers(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Get('invitations')
  @ApiOperation({ summary: 'Get organization invitations' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the ORGANIZATION role.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  getInvitations(@CurrentUser() user: { sub: string }) {
    return this.organizationService.getInvitations(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Delete('invitations/:id')
  @ApiOperation({ summary: 'Cancel a pending organization invitation' })
  @ApiBadRequestResponse({ description: 'Invalid invitation ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the ORGANIZATION role or invitation belongs to another organization.' })
  @ApiNotFoundResponse({ description: 'User or invitation not found.' })
  @ApiConflictResponse({ description: 'Invitation cannot be cancelled because it is no longer pending.' })
  cancelInvitation(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.organizationService.cancelInvitation(user.sub, invitationId);
  }

  @UseGuards(ThrottlerGuard, JwtAuthGuard, RolesGuard)
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @Roles('ORGANIZATION')
  @Post('invitations/:id/resend')
  @ApiOperation({ summary: 'Resend an organization invitation' })
  @ApiBadRequestResponse({ description: 'Invalid invitation ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the ORGANIZATION role or invitation belongs to another organization.' })
  @ApiNotFoundResponse({ description: 'User or invitation not found.' })
  @ApiConflictResponse({ description: 'Invitation cannot be resent because of its current state or resend cooldown.' })
  resendInvitation(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.organizationService.resendInvitation(user.sub, invitationId);
  }
}