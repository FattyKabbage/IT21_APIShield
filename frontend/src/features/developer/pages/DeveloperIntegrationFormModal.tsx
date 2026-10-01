import { useState } from 'react';
import type { FormEvent } from 'react';
import { SensitiveInput } from '../../../components/SensitiveInput';
import { Modal } from '../../dashboard/components/Modal';
import type {
  ApiCredentialPlacement,
  ApiIntegration,
  ApiIntegrationAuthType,
  ApiIntegrationStatus,
} from '../../integrations/integration.types';
import type {
  CreateDeveloperIntegrationPayload,
  DeveloperIntegrationCredential,
} from '../developer.api';

export interface DeveloperIntegrationFormValues
  extends CreateDeveloperIntegrationPayload {
  status?: ApiIntegrationStatus;
}

interface DeveloperIntegrationFormModalProps {
  title: string;
  submitLabel: string;
  processing: boolean;
  integration?: ApiIntegration;
  onClose: () => void;
  onSubmit: (
    values: DeveloperIntegrationFormValues,
  ) => Promise<void> | void;
}

export function DeveloperIntegrationFormModal({
  title,
  submitLabel,
  processing,
  integration,
  onClose,
  onSubmit,
}: DeveloperIntegrationFormModalProps) {
  const [name, setName] = useState(
    integration?.name ?? '',
  );

  const [provider, setProvider] = useState(
    integration?.provider ?? '',
  );

  const [baseUrl, setBaseUrl] = useState(
    integration?.baseUrl ?? '',
  );

  const [authType, setAuthType] =
    useState<ApiIntegrationAuthType>(
      integration?.authType ?? 'NONE',
    );

  const [credentialPlacement, setCredentialPlacement] =
    useState<ApiCredentialPlacement>(
      integration?.credentialPlacement ??
        'HEADER',
    );

  const [credentialName, setCredentialName] =
    useState(
      integration?.credentialName ?? '',
    );

  const [apiSecret, setApiSecret] =
    useState('');

  const [basicUsername, setBasicUsername] =
    useState('');

  const [basicPassword, setBasicPassword] =
    useState('');

  const [status, setStatus] =
    useState<ApiIntegrationStatus>(
      integration?.status ?? 'ACTIVE',
    );

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  function handleAuthTypeChange(
    nextAuthType: ApiIntegrationAuthType,
  ) {
    setAuthType(nextAuthType);
    setApiSecret('');
    setBasicUsername('');
    setBasicPassword('');
    setErrors({});

    if (nextAuthType !== 'API_KEY') {
      setCredentialPlacement('HEADER');
      setCredentialName('');
    }
  }

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name =
        'Integration name is required.';
    }

    if (!provider.trim()) {
      nextErrors.provider =
        'Provider name is required.';
    }

    if (!baseUrl.trim()) {
      nextErrors.baseUrl =
        'Base URL is required.';
    } else {
      try {
        const url = new URL(
          baseUrl.trim(),
        );

        if (url.protocol !== 'https:') {
          nextErrors.baseUrl =
            'Base URL must use HTTPS.';
        }
      } catch {
        nextErrors.baseUrl =
          'Enter a valid provider URL.';
      }
    }

    if (
      authType === 'API_KEY' &&
      !credentialName.trim()
    ) {
      nextErrors.credentialName =
        'Credential name is required for API key authentication.';
    }

    const authTypeChanged =
      integration !== undefined &&
      integration.authType !== authType;

    const credentialRequired =
      authType !== 'NONE' &&
      (!integration?.hasCredential ||
        authTypeChanged);

    if (
      (authType === 'API_KEY' ||
        authType === 'BEARER_TOKEN') &&
      credentialRequired &&
      !apiSecret.trim()
    ) {
      nextErrors.apiSecret =
        'Provider credential is required.';
    }

    if (authType === 'BASIC_AUTH') {
      const basicCredentialProvided =
        basicUsername.trim() ||
        basicPassword;

      if (
        credentialRequired ||
        basicCredentialProvided
      ) {
        if (!basicUsername.trim()) {
          nextErrors.basicUsername =
            'Username is required.';
        }

        if (!basicPassword) {
          nextErrors.basicPassword =
            'Password is required.';
        }
      }
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  function buildCredential():
    | DeveloperIntegrationCredential
    | undefined {
    if (authType === 'NONE') {
      return undefined;
    }

    if (authType === 'API_KEY') {
      if (!apiSecret.trim()) return undefined;

      return {
        value: apiSecret.trim(),
      };
    }

    if (authType === 'BEARER_TOKEN') {
      if (!apiSecret.trim()) return undefined;

      return {
        token: apiSecret.trim(),
      };
    }

    if (
      !basicUsername.trim() &&
      !basicPassword
    ) {
      return undefined;
    }

    return {
      username: basicUsername.trim(),
      password: basicPassword,
    };
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validate()) return;

    const credential = buildCredential();

    const values: DeveloperIntegrationFormValues = {
      name: name.trim(),
      provider: provider.trim(),
      baseUrl: baseUrl.trim(),
      authType,
      ...(authType === 'API_KEY'
        ? {
            credentialPlacement,
            credentialName:
              credentialName.trim(),
          }
        : {}),
      ...(credential
        ? {
            credential,
          }
        : {}),
      ...(integration
        ? {
            status,
          }
        : {}),
    };

    void onSubmit(values);
  }

  const sameCredentialType =
    integration?.hasCredential &&
    integration.authType === authType;

  return (
    <Modal
      title={title}
      onClose={onClose}
    >
      <form
        className="integration-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="integration-form-body">
          <div className="form-field">
            <label htmlFor="developer-integration-name">
              Integration name
            </label>

            <input
              id="developer-integration-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="HTTPBin API"
            />

            {errors.name && (
              <span className="integration-form-error">
                {errors.name}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="developer-integration-provider">
              Provider
            </label>

            <input
              id="developer-integration-provider"
              type="text"
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value)
              }
              placeholder="HTTPBin"
            />

            {errors.provider && (
              <span className="integration-form-error">
                {errors.provider}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="developer-integration-url">
              Base URL
            </label>

            <input
              id="developer-integration-url"
              type="url"
              value={baseUrl}
              onChange={(event) =>
                setBaseUrl(event.target.value)
              }
              placeholder="https://httpbin.org"
            />

            {errors.baseUrl && (
              <span className="integration-form-error">
                {errors.baseUrl}
              </span>
            )}

            <span className="integration-form-help">
              HTTPS is required. APIShield also performs authoritative outbound destination validation on the backend.
            </span>
          </div>

          <div className="form-field">
            <label htmlFor="developer-integration-auth">
              Authentication
            </label>

            <select
              id="developer-integration-auth"
              value={authType}
              onChange={(event) =>
                handleAuthTypeChange(
                  event.target
                    .value as ApiIntegrationAuthType,
                )
              }
            >
              <option value="NONE">
                No authentication
              </option>

              <option value="API_KEY">
                API key
              </option>

              <option value="BEARER_TOKEN">
                Bearer token
              </option>

              <option value="BASIC_AUTH">
                Basic authentication
              </option>
            </select>
          </div>

          {authType === 'API_KEY' && (
            <div className="integration-form-grid">
              <div className="form-field">
                <label htmlFor="developer-key-placement">
                  API key placement
                </label>

                <select
                  id="developer-key-placement"
                  value={credentialPlacement}
                  onChange={(event) =>
                    setCredentialPlacement(
                      event.target
                        .value as ApiCredentialPlacement,
                    )
                  }
                >
                  <option value="HEADER">
                    Request header
                  </option>

                  <option value="QUERY">
                    Query parameter
                  </option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="developer-key-name">
                  {credentialPlacement ===
                  'HEADER'
                    ? 'Header name'
                    : 'Query parameter name'}
                </label>

                <input
                  id="developer-key-name"
                  type="text"
                  value={credentialName}
                  onChange={(event) =>
                    setCredentialName(
                      event.target.value,
                    )
                  }
                  placeholder={
                    credentialPlacement ===
                    'HEADER'
                      ? 'X-API-Key'
                      : 'api_key'
                  }
                />

                {errors.credentialName && (
                  <span className="integration-form-error">
                    {errors.credentialName}
                  </span>
                )}
              </div>
            </div>
          )}

          {(authType === 'API_KEY' ||
            authType === 'BEARER_TOKEN') && (
            <div className="form-field">
              <label htmlFor="developer-provider-secret">
                {authType === 'API_KEY'
                  ? 'API key'
                  : 'Bearer token'}
              </label>

              <SensitiveInput
                id="developer-provider-secret"
                value={apiSecret}
                onChange={(event) =>
                  setApiSecret(
                    event.target.value,
                  )
                }
                placeholder={
                  sameCredentialType
                    ? 'Leave blank to keep the existing credential'
                    : authType === 'API_KEY'
                      ? 'Enter provider API key'
                      : 'Enter provider bearer token'
                }
                autoComplete="off"
              />

              {errors.apiSecret && (
                <span className="integration-form-error">
                  {errors.apiSecret}
                </span>
              )}

              {sameCredentialType && (
                <span className="integration-credential-existing">
                  A provider credential is already configured. Leave this field blank unless you want to replace it.
                </span>
              )}
            </div>
          )}

          {authType === 'BASIC_AUTH' && (
            <>
              <div className="form-field">
                <label htmlFor="developer-basic-username">
                  Username
                </label>

                <input
                  id="developer-basic-username"
                  type="text"
                  value={basicUsername}
                  onChange={(event) =>
                    setBasicUsername(
                      event.target.value,
                    )
                  }
                  placeholder={
                    sameCredentialType
                      ? 'Leave both fields blank to keep the existing credential'
                      : 'Enter provider username'
                  }
                  autoComplete="off"
                />

                {errors.basicUsername && (
                  <span className="integration-form-error">
                    {errors.basicUsername}
                  </span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="developer-basic-password">
                  Password
                </label>

                <SensitiveInput
                  id="developer-basic-password"
                  value={basicPassword}
                  onChange={(event) =>
                    setBasicPassword(
                      event.target.value,
                    )
                  }
                  placeholder={
                    sameCredentialType
                      ? 'Leave both fields blank to keep the existing credential'
                      : 'Enter provider password'
                  }
                  autoComplete="off"
                />

                {errors.basicPassword && (
                  <span className="integration-form-error">
                    {errors.basicPassword}
                  </span>
                )}

                {sameCredentialType && (
                  <span className="integration-credential-existing">
                    Basic authentication credentials are already configured and are not displayed again.
                  </span>
                )}
              </div>
            </>
          )}

          {integration && (
            <div className="form-field">
              <label htmlFor="developer-integration-status">
                Status
              </label>

              <select
                id="developer-integration-status"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as ApiIntegrationStatus,
                  )
                }
              >
                <option value="ACTIVE">
                  Active
                </option>

                <option value="DISABLED">
                  Disabled
                </option>
              </select>
            </div>
          )}

          <div className="integration-security-note">
            <strong>
              Provider credential security
            </strong>

            <p>
              Provider secrets are sent to APIShield for encrypted storage and are never displayed again after they are saved.
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="button primary"
            disabled={processing}
          >
            {processing
              ? 'Saving...'
              : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}