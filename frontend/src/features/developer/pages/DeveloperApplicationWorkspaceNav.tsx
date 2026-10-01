import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { getDeveloperProfile } from '../developer.api';
import type { DeveloperMembershipType } from '../developer.types';

interface DeveloperApplicationWorkspaceNavProps {
  applicationId: string;
}

export function DeveloperApplicationWorkspaceNav({ applicationId }: DeveloperApplicationWorkspaceNavProps) {
  const { accessToken } = useAuth();
  const [membershipType, setMembershipType] = useState<DeveloperMembershipType | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!accessToken) return;

      try {
        const profile = await getDeveloperProfile(accessToken);
        if (active) setMembershipType(profile.membershipType);
      } catch {
        if (active) setMembershipType(null);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const basePath = `/developer/applications/${applicationId}`;

  const workspaceItems =
    membershipType === 'INDEPENDENT'
      ? [
          { label: 'Overview', suffix: '' },
          { label: 'Credentials', suffix: '/credentials' },
          { label: 'Integrations', suffix: '/integrations' },
          { label: 'Activity Log', suffix: '/activity' },
          { label: 'Gateway Activity', suffix: '/gateway-activity' },
        ]
      : [
          { label: 'Overview', suffix: '' },
          { label: 'Integrations', suffix: '/integrations' },
          { label: 'Gateway Activity', suffix: '/gateway-activity' },
        ];

  return (
    <nav className="developer-workspace-nav" aria-label="Developer application workspace">
      {workspaceItems.map((item) => (
        <NavLink
          key={item.label}
          to={`${basePath}${item.suffix}`}
          end={item.suffix === ''}
          className={({ isActive }) => `developer-workspace-link ${isActive ? 'active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}