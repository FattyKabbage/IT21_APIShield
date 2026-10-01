import { useState } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import type { UserRole } from '../../auth/auth.types';
import { Modal } from './Modal';

interface TopbarProps {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
}

interface TopbarContent {
  eyebrow: string;
  title: string;
}

function getTopbarContent(pathname: string, role?: UserRole): TopbarContent {
  if (pathname.startsWith('/dashboard/applications')) {
    return {
      eyebrow: 'ORGANIZATION MANAGEMENT',
      title: 'Client Applications',
    };
  }

  if (pathname.startsWith('/dashboard/organizations')) {
    return {
      eyebrow: 'ORGANIZATION MANAGEMENT',
      title: 'Organization',
    };
  }

  if (pathname.startsWith('/developer')) {
    return {
      eyebrow: 'DEVELOPER WORKSPACE',
      title: 'Developer',
    };
  }

  if (pathname.startsWith('/admin')) {
    return {
      eyebrow: 'SYSTEM ADMINISTRATION',
      title: 'System Administration',
    };
  }

  if (role === 'ORGANIZATION') {
    return {
      eyebrow: 'ORGANIZATION MANAGEMENT',
      title: 'APIShield',
    };
  }

  if (role === 'SYSTEM_ADMIN') {
    return {
      eyebrow: 'SYSTEM ADMINISTRATION',
      title: 'APIShield',
    };
  }

  return {
    eyebrow: 'DEVELOPER WORKSPACE',
    title: 'APIShield',
  };
}

export function Topbar({ sidebarOpen, onOpenSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [showLogout, setShowLogout] = useState(false);

  const content = getTopbarContent(location.pathname, user?.role);

  function handleLogout() {
    setShowLogout(false);
    logout();
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-heading-group">
          {!sidebarOpen && (
            <button
              type="button"
              className="mobile-menu"
              onClick={onOpenSidebar}
              aria-label="Open navigation"
            >
              ☰
            </button>
          )}

          <div>
            <p className="topbar-eyebrow">
              {content.eyebrow}
            </p>

            <h1>{content.title}</h1>
          </div>
        </div>

        <div className="topbar-user">
          <div className="user-avatar">
            {user?.email?.charAt(0).toUpperCase()}
          </div>

          <div className="user-info">
            <strong>{user?.email}</strong>
            <span>{user?.role}</span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={() => setShowLogout(true)}
          >
            Sign out
          </button>
        </div>
      </header>

      {showLogout && (
        <Modal
          title="Sign out?"
          onClose={() => setShowLogout(false)}
        >
          <p className="modal-text">
            Your current APIShield management session will be ended.
          </p>

          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setShowLogout(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="button danger"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}