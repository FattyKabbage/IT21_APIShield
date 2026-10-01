import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

export interface EncryptedProviderCredential {
  encryptedCredential: string;
  credentialIv: string;
  credentialAuthTag: string;
}


//pwede gamiton anywhere since it is injectable
//The service encrypts and decrypts provider credentials using AES-256-GCM. The encryption key is stored in PROVIDER_CREDENTIAL_ENCRYPTION_KEY. The ciphertext, IV, and authentication tag are stored in the database as Base64-encoded strings. The encryption key must decode from Base64 to exactly 32 bytes.
// IV is Initialization Vector, which is a random value used to ensure that the same plaintext encrypted multiple times will produce different ciphertexts. The authentication tag is used to verify the integrity and authenticity of the encrypted data during decryption.
// basically, if two application happened to store the exact same API key, the encrypted value will be different because of the random IV. The authentication tag ensures that the data has not been tampered with during storage or transmission.
// Auth tag  -  gcm integrity check, it detects wether encrypted data has been tampered with. It is generated during encryption and verified during decryption. If the auth tag does not match, decryption fails, indicating potential tampering or corruption of the encrypted data.

@Injectable()
export class ProviderCredentialEncryptionService {
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const encodedKey =
      this.configService.get<string>(
        'PROVIDER_CREDENTIAL_ENCRYPTION_KEY',
      );

    if (!encodedKey) {
      throw new Error(
        'PROVIDER_CREDENTIAL_ENCRYPTION_KEY is not configured',
      );
    }

    const encryptionKey =
      Buffer.from(encodedKey, 'base64');

    if (encryptionKey.length !== 32) {
      throw new Error(
        'PROVIDER_CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes',
      );
    }

    this.encryptionKey = encryptionKey;
  }

  encrypt(
    credential: unknown,
  ): EncryptedProviderCredential {
    const iv = randomBytes(12);

    const cipher = createCipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv,
    );

    const plaintext =
      JSON.stringify(credential);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encryptedCredential:
        encrypted.toString('base64'),

      credentialIv:
        iv.toString('base64'),

      credentialAuthTag:
        authTag.toString('base64'),
    };
  }

  decrypt<T>(
    encryptedCredential: string,
    credentialIv: string,
    credentialAuthTag: string,
  ): T {
    try {
      const encrypted =
        Buffer.from(
          encryptedCredential,
          'base64',
        );

      const iv =
        Buffer.from(
          credentialIv,
          'base64',
        );

      const authTag =
        Buffer.from(
          credentialAuthTag,
          'base64',
        );

      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        iv,
      );

      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return JSON.parse(
        decrypted.toString('utf8'),
      ) as T;
    } catch {
      throw new InternalServerErrorException(
        'Stored provider credential could not be decrypted',
      );
    }
  }
}