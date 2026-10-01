
//this file defines the structure of the payload that will be included in the JWT token for application authentication. The payload contains information about the application, such as its ID, organization ID, and client ID, as well as the token type and optional issued at and expiration times.
export interface ApplicationJwtPayload {
  sub: string;
  organizationId: string;
  clientId: string;
  tokenType: 'APPLICATION';
  iat?: number;
  exp?: number;
}
