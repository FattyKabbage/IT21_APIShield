import type { OrganizationWorkspaceSection } from '../organization.types';

interface OrganizationWorkspaceNavProps {
  activeSection: OrganizationWorkspaceSection;
  onChange: (section: OrganizationWorkspaceSection) => void;
}

const sections: {
  label: string;
  value: OrganizationWorkspaceSection;
}[] = [
  {
    label: 'Overview',
    value: 'overview',
  },
  {
    label: 'Members',
    value: 'members',
  },
  {
    label: 'Invitations',
    value: 'invitations',
  },
];

export function OrganizationWorkspaceNav({
  activeSection,
  onChange,
}: OrganizationWorkspaceNavProps) {
  return (
    <nav
      className="organization-workspace-nav"
      aria-label="Organization workspace"
    >
      {sections.map((section) => (
        <button
          key={section.value}
          type="button"
          className={`organization-workspace-link ${
            activeSection === section.value
              ? 'active'
              : ''
          }`}
          onClick={() =>
            onChange(section.value)
          }
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}