const REQUIRED_VALUES = [
  'DATABASE_URL',
  'JWT_SECRET',
  'BOOTSTRAP_SECRET',
  'APPLICATION_JWT_SECRET',
  'PROVIDER_CREDENTIAL_ENCRYPTION_KEY',
  'FRONTEND_URL',
] as const;

function requireValue(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
}

function requirePositiveInteger(config: Record<string, unknown>, key: string) {
  const value = requireValue(config, key);
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
}

export function validateEnvironment(config: Record<string, unknown>) {
  for (const key of REQUIRED_VALUES) {
    requireValue(config, key);
  }

  const nodeEnv = String(config.NODE_ENV ?? 'development');

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const databaseUrl = requireValue(config, 'DATABASE_URL');

  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  }

  try {
    new URL(requireValue(config, 'FRONTEND_URL'));
  } catch {
    throw new Error('FRONTEND_URL must be a valid URL');
  }

  requirePositiveInteger(config, 'JWT_EXPIRES_IN');
  requirePositiveInteger(config, 'REFRESH_TOKEN_EXPIRES_DAYS');
  requirePositiveInteger(config, 'GATEWAY_RATE_LIMIT_MAX');
  requirePositiveInteger(config, 'GATEWAY_RATE_LIMIT_TTL_MS');

  const jwtSecret = requireValue(config, 'JWT_SECRET');
  const applicationJwtSecret = requireValue(config, 'APPLICATION_JWT_SECRET');

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  if (applicationJwtSecret.length < 32) {
    throw new Error('APPLICATION_JWT_SECRET must contain at least 32 characters');
  }

  const provider = String(config.MAIL_PROVIDER ?? 'smtp').toLowerCase();

  if (!['smtp', 'brevo'].includes(provider)) {
    throw new Error('MAIL_PROVIDER must be smtp or brevo');
  }

  requireValue(config, 'MAIL_FROM');

  if (provider === 'brevo') {
    requireValue(config, 'BREVO_API_KEY');
  }

  config.NODE_ENV = nodeEnv;
  config.MAIL_PROVIDER = provider;

  return config;
}