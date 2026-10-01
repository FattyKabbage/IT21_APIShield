import { NavLink } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import type { UserRole } from '../../auth/auth.types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavigationItem {
  label: string;
  path: string;
}

function getNavigation(role: UserRole): NavigationItem[] {
  if (role === 'ORGANIZATION') {
    return [
      { label: 'Overview', path: '/dashboard' },
      { label: 'Client Applications', path: '/dashboard/applications' },
      { label: 'Organization', path: '/dashboard/organizations' },
    ];
  }

 if (role === 'SYSTEM_ADMIN') {
    return [
      { label: 'Overview', path: '/admin' },
      { label: 'Users', path: '/admin/users' },
      { label: 'Organizations', path: '/admin/organizations' },
      { label: 'Security Events', path: '/admin/security-events' },
    ];
  }

  return [
    { label: 'Overview', path: '/developer' },
    { label: 'Applications', path: '/developer/applications' },
  ];
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const navigation = user ? getNavigation(user.role) : [];

  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo.png" alt="APIShield" className="brand-logo" />

            <div className="sidebar-brand-text">
              <strong>APIShield</strong>
              <span>Secure API Management</span>
            </div>
          </div>

          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close navigation">
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">
            {user?.role === 'SYSTEM_ADMIN' ? 'ADMINISTRATION' : user?.role === 'DEVELOPER' ? 'WORKSPACE' : 'MANAGEMENT'}
          </p>

          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard' || item.path === '/developer' || item.path === '/admin'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-status">
          <span className="status-dot" />

          <div>
            <strong>Session active</strong>
            <span>{user?.role ?? 'Authenticated'}</span>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className={`sidebar-overlay ${open ? 'sidebar-overlay-open' : ''}`}
        onClick={onClose}
        aria-label="Close navigation"
      />
    </>
  );
}