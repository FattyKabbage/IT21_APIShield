import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import { FeedbackModal } from '../../dashboard/components/FeedbackModal';
import { CancelInvitationModal } from '../components/CancelInvitationModal';
import { InviteDeveloperModal } from '../components/InviteDeveloperModal';
import { OrganizationInvitations } from '../components/OrganizationInvitations';
import { OrganizationMembers } from '../components/OrganizationMembers';
import { OrganizationOverview } from '../components/OrganizationOverview';

import { ResendInvitationModal } from '../components/ResendInvitationModal';
import { INVITATION_RESEND_COOLDOWN_SECONDS } from '../organization.constants';
import { cancelOrganizationInvitation, createOrganizationInvitation, getOrganization, getOrganizationInvitations, getOrganizationMembers, resendOrganizationInvitation } from '../organization.api';
import type { Organization, OrganizationInvitation, OrganizationMember, OrganizationWorkspaceSection } from '../organization.types';
import '../organization.css';
import { OrganizationWorkspaceNav } from '../components/OrganizationWorskspaceNav';

export function OrganizationPage() {
  const { accessToken } = useAuth();

  const [activeSection, setActiveSection] = useState<OrganizationWorkspaceSection>('overview');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitationToResend, setInvitationToResend] = useState<OrganizationInvitation | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<OrganizationInvitation | null>(null);

  const [resendCooldowns, setResendCooldowns] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  async function loadOrganization() {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const [organizationData, memberData, invitationData] = await Promise.all([
        getOrganization(accessToken),
        getOrganizationMembers(accessToken),
        getOrganizationInvitations(accessToken),
      ]);

      setOrganization(organizationData);
      setMembers(memberData);
      setInvitations(invitationData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load organization.');
    } finally {
      setLoading(false);
    }
  }

  async function reloadInvitations() {
    if (!accessToken) return;

    const data = await getOrganizationInvitations(accessToken);
    setInvitations(data);
  }

  useEffect(() => {
    void loadOrganization();
  }, [accessToken]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setResendCooldowns((current) => {
        const entries = Object.entries(current);

        if (!entries.some(([, seconds]) => seconds > 0)) return current;

        const next: Record<string, number> = {};

        for (const [invitationId, seconds] of entries) {
          if (seconds > 1) next[invitationId] = seconds - 1;
        }

        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function handleInviteDeveloper(email: string) {
    if (!accessToken) return;

    try {
      setProcessing(true);

      const response = await createOrganizationInvitation(accessToken, { email });

      await reloadInvitations();

      setShowInviteModal(false);

      setFeedback({
        type: 'success',
        title: 'Invitation sent',
        message: response.message || 'The developer invitation was sent successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to send invitation',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleResendInvitation() {
    if (!accessToken || !invitationToResend) return;

    try {
      setProcessing(true);

      const invitationId = invitationToResend.id;
      const response = await resendOrganizationInvitation(accessToken, invitationId);

      await reloadInvitations();

      setResendCooldowns((current) => ({
        ...current,
        [invitationId]: INVITATION_RESEND_COOLDOWN_SECONDS,
      }));

      setInvitationToResend(null);

      setFeedback({
        type: 'success',
        title: 'Invitation resent',
        message: response.message || 'A new invitation link was sent successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to resend invitation',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancelInvitation() {
    if (!accessToken || !invitationToCancel) return;

    try {
      setProcessing(true);

      const response = await cancelOrganizationInvitation(accessToken, invitationToCancel.id);

      await reloadInvitations();

      setInvitationToCancel(null);

      setFeedback({
        type: 'success',
        title: 'Invitation cancelled',
        message: response.message || 'The invitation was cancelled successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to cancel invitation',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <DashboardLayout>
      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">ORGANIZATION MANAGEMENT</p>
          <h2>Organization</h2>
          <p>Manage organization information, members and Developer invitations.</p>
        </div>
      </section>

      <OrganizationWorkspaceNav activeSection={activeSection} onChange={setActiveSection} />

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading organization...</strong>
            <p>Please wait while APIShield retrieves your organization workspace.</p>
          </div>
        </section>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void loadOrganization()} />}

      {!loading && !error && organization && (
        <>
          {activeSection === 'overview' && (
            <OrganizationOverview organization={organization} members={members} invitations={invitations} />
          )}

          {activeSection === 'members' && <OrganizationMembers members={members} />}

          {activeSection === 'invitations' && (
            <OrganizationInvitations
              invitations={invitations}
              resendCooldowns={resendCooldowns}
              onInvite={() => setShowInviteModal(true)}
              onResend={setInvitationToResend}
              onCancel={setInvitationToCancel}
            />
          )}
        </>
      )}

      {showInviteModal && (
        <InviteDeveloperModal
          processing={processing}
          onClose={() => !processing && setShowInviteModal(false)}
          onSubmit={handleInviteDeveloper}
        />
      )}

      {invitationToResend && (
        <ResendInvitationModal
          invitation={invitationToResend}
          processing={processing}
          cooldown={resendCooldowns[invitationToResend.id] ?? 0}
          onClose={() => !processing && setInvitationToResend(null)}
          onConfirm={handleResendInvitation}
        />
      )}

      {invitationToCancel && (
        <CancelInvitationModal
          invitation={invitationToCancel}
          processing={processing}
          onClose={() => !processing && setInvitationToCancel(null)}
          onConfirm={handleCancelInvitation}
        />
      )}

      {feedback && (
        <FeedbackModal
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </DashboardLayout>
  );
}