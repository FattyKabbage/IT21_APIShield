import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service.js';
import { ProviderCredentialEncryptionService } from '../../lib/security/provider-credential-encryption.service.js';
import {
  OutboundQuery,
  OutboundQueryPrimitive,
  OutboundUrlSafetyService,
} from '../../lib/security/outbound-url-safety.service.js';
import { GatewayRequestDto } from './dto/gateway-request.dto.js';


@Injectable()
export class ApiGatewayService {
  private readonly maximumResponseBytes = 1024 * 1024;
  //in case activity record fails
  private readonly logger = new Logger(ApiGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: ProviderCredentialEncryptionService,
    private readonly outboundUrlSafetyService: OutboundUrlSafetyService,
  ) {}

   //added loger para sa activity record
  async executeRequest(
  applicationId: string,
  integrationId: string,
  dto: GatewayRequestDto,
  ) {
    const startedAt = Date.now();

    const integration = await this.prisma.db.orm.public.ApiIntegration
      .where({
        id: integrationId,
        applicationId,
      })
      .first();

    if (!integration) {
      throw new NotFoundException('API integration not found');
    }

    let providerStatus: number | null = null;

    try {
      if (integration.status !== 'ACTIVE') {
        throw new BadRequestException('API integration is disabled');
      }

      if (dto.method === 'GET' && dto.body !== undefined) {
        throw new BadRequestException('GET requests cannot contain a request body');
      }

      const query = this.normalizeQuery(dto.query);
      const headers = this.normalizeHeaders(dto.headers);

      this.applyProviderCredential(
        integration.authType,
        integration.credentialPlacement,
        integration.credentialName,
        integration.encryptedCredential,
        integration.credentialIv,
        integration.credentialAuthTag,
        query,
        headers,
      );

      const targetUrl = await this.outboundUrlSafetyService.buildSafeRequestUrl(
        integration.baseUrl,
        dto.path,
        query,
      );

      let body: string | undefined;

      if (dto.body !== undefined) {
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json';
        }

        body = JSON.stringify(dto.body);
      }

      let response: Response;

      try {
        response = await fetch(targetUrl, {
          method: dto.method,
          headers,
          body,
          redirect: 'manual',
          signal: AbortSignal.timeout(10000),
        });
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'TimeoutError' || error.name === 'AbortError')
        ) {
          throw new GatewayTimeoutException('Provider request timed out');
        }

        throw new BadGatewayException('Provider request failed');
      }

      providerStatus = response.status;

      const contentLength = response.headers.get('content-length');

      if (
        contentLength &&
        Number.isFinite(Number(contentLength)) &&
        Number(contentLength) > this.maximumResponseBytes
      ) {
        throw new BadGatewayException('Provider response exceeded APIShield response limit');
      }

      const responseBuffer = Buffer.from(await response.arrayBuffer());

      if (responseBuffer.length > this.maximumResponseBytes) {
        throw new BadGatewayException('Provider response exceeded APIShield response limit');
      }

      const contentType = response.headers.get('content-type') ?? '';
      const responseText = responseBuffer.toString('utf8');

      let data: unknown = responseText;

      if (
        contentType.includes('application/json') ||
        contentType.includes('+json')
      ) {
        try {
          data = responseText ? JSON.parse(responseText) : null;
        } catch {
          data = responseText;
        }
      }

      await this.writeGatewayRequestLog(
        applicationId,
        integration.id,
        dto.method,
        dto.path,
        providerStatus,
        response.ok ? 'SUCCESS' : 'PROVIDER_ERROR',
        startedAt,
      );

      return {
        integrationId: integration.id,
        provider: integration.provider,
        providerStatus: response.status,
        providerOk: response.ok,
        contentType: contentType || null,
        data,
      };
    } catch (error) {
      await this.writeGatewayRequestLog(
        applicationId,
        integration.id,
        dto.method,
        dto.path,
        providerStatus,
        'GATEWAY_ERROR',
        startedAt,
      );

      throw error;
    }
  }

  private normalizeQuery(query?: Record<string, unknown>): OutboundQuery {
    if (!query) return {};

    if (Object.keys(query).length > 100) {
      throw new BadRequestException('Too many query parameters');
    }

    const normalized: OutboundQuery = {};

    for (const [key, value] of Object.entries(query)) {
      if (!key.trim()) {
        throw new BadRequestException('Query parameter names cannot be empty');
      }

      if (Array.isArray(value)) {
        if (!value.every((item) => this.isQueryPrimitive(item))) {
          throw new BadRequestException(`Query parameter "${key}" contains an unsupported value`);
        }

        normalized[key] = value as OutboundQueryPrimitive[];
        continue;
      }

      if (!this.isQueryPrimitive(value)) {
        throw new BadRequestException(`Query parameter "${key}" contains an unsupported value`);
      }

      normalized[key] = value;
    }

    return normalized;
  }

  private isQueryPrimitive(value: unknown): value is OutboundQueryPrimitive {
    return (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  private normalizeHeaders(headers?: Record<string, unknown>): Record<string, string> {
    if (!headers) return {};

    if (Object.keys(headers).length > 50) {
      throw new BadRequestException('Too many request headers');
    }

    const blockedHeaders = new Set([
      'authorization',
      'connection',
      'content-length',
      'cookie',
      'host',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'set-cookie',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
      'via',
    ]);

    const normalized: Record<string, string> = {};

    for (const [originalName, value] of Object.entries(headers)) {
      const name = originalName.trim().toLowerCase();

      if (!name || !/^[!#$%&'*+\-.^_`|~0-9a-z]+$/.test(name)) {
        throw new BadRequestException(`Invalid request header "${originalName}"`);
      }

      if (blockedHeaders.has(name) || name.startsWith('x-forwarded-')) {
        throw new BadRequestException(`Request header "${originalName}" is not allowed`);
      }

      if (typeof value !== 'string') {
        throw new BadRequestException(`Request header "${originalName}" must be a string`);
      }

      if (/[\r\n]/.test(value)) {
        throw new BadRequestException(`Request header "${originalName}" contains invalid characters`);
      }

      normalized[name] = value;
    }

    return normalized;
  }

  private applyProviderCredential(
    authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH',
    credentialPlacement: 'HEADER' | 'QUERY' | null,
    credentialName: string | null,
    encryptedCredential: string | null,
    credentialIv: string | null,
    credentialAuthTag: string | null,
    query: OutboundQuery,
    headers: Record<string, string>,
  ): void {
    if (authType === 'NONE') return;

    if (!encryptedCredential || !credentialIv || !credentialAuthTag) {
      throw new InternalServerErrorException(
        'Integration credential configuration is incomplete',
      );
    }

    const credential = this.encryptionService.decrypt<Record<string, unknown>>(
      encryptedCredential,
      credentialIv,
      credentialAuthTag,
    );

    if (authType === 'API_KEY') {
      if (
        typeof credential.value !== 'string' ||
        !credential.value ||
        !credentialPlacement ||
        !credentialName
      ) {
        throw new InternalServerErrorException('Stored API key credential is invalid');
      }

      if (credentialPlacement === 'QUERY') {
        if (query[credentialName] !== undefined) {
          throw new BadRequestException(
            `Query parameter "${credentialName}" is managed by APIShield`,
          );
        }

        query[credentialName] = credential.value;
        return;
      }

      const headerName = credentialName.toLowerCase();

      if (headers[headerName] !== undefined) {
        throw new BadRequestException(
          `Request header "${credentialName}" is managed by APIShield`,
        );
      }

      headers[headerName] = credential.value;
      return;
    }

    if (headers.authorization !== undefined) {
      throw new BadRequestException('Authorization header is managed by APIShield');
    }

    if (authType === 'BEARER_TOKEN') {
      if (typeof credential.token !== 'string' || !credential.token) {
        throw new InternalServerErrorException('Stored bearer token credential is invalid');
      }

      headers.authorization = `Bearer ${credential.token}`;
      return;
    }

    if (
      typeof credential.username !== 'string' ||
      typeof credential.password !== 'string' ||
      !credential.username ||
      !credential.password
    ) {
      throw new InternalServerErrorException('Stored basic authentication credential is invalid');
    }

    const basicCredential = Buffer.from(
      `${credential.username}:${credential.password}`,
      'utf8',
    ).toString('base64');

    headers.authorization = `Basic ${basicCredential}`;
  }
  // logger
  private async writeGatewayRequestLog(
  applicationId: string,
  integrationId: string,
  method: string,
  path: string,
  providerStatus: number | null,
  outcome: 'SUCCESS' | 'PROVIDER_ERROR' | 'GATEWAY_ERROR',
  startedAt: number,
): Promise<void> {
  const durationMs = Math.max(0, Date.now() - startedAt);

  try {
    await this.prisma.db.orm.public.GatewayRequestLog.create({
      applicationId,
      integrationId,
      method,
      path,
      providerStatus,
      outcome,
      durationMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown gateway request log error';
    this.logger.error(`Failed to persist gateway request log: ${message}`);
  }
}
}