import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApplicationAuthController } from './application-auth.controller.js';
import { ApplicationAuthService } from './application-auth.service.js';
import { ApplicationJwtGuard } from '../../common/guards/application-jwt/application-jwt.guard.js';

//this module is for handling of signing a temporary token that represents the authentication of an application. This is used for the application to authenticate itself to the backend and get a token that can be used to access the backend's resources.
@Module({
 imports: [
    JwtModule.register({}),
  ],
  controllers: [
    ApplicationAuthController,
  ],
  providers: [
    ApplicationAuthService,
    ApplicationJwtGuard,
  ],
  exports: [
    ApplicationJwtGuard,
  ],
})
export class ApplicationAuthModule {}

//signature lets the system later verify the token really came from the system and nobody modifies its contents

//if the application is compromised, the attacker can use the token to access the backend's resources. Therefore, it is important to keep the signing key secret and rotate it regularly.

//if the application is compromised, the attacker can use the token to access the backend's resources. Therefore, it is important to keep the signing key secret and rotate it regularly.

//if the jwt expires, the application will need to re-authenticate itself to get a new token. This is a security measure to limit the time an attacker can use a stolen token.

//after checking the client id and client secret, the backend will issue a jwt token that represents the authentication of the application. This token can be used to access the backend's resources.

// payload
  //application, organization owner, autn