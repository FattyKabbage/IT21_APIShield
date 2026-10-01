import { DashboardLayout } from '../components/DashboardLayout';

interface RoleLandingPageProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function RoleLandingPage({
  eyebrow,
  title,
  description,
}: RoleLandingPageProps) {
  return (
    <DashboardLayout>
      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">
            {eyebrow}
          </p>

          <h2>{title}</h2>

          <p>{description}</p>
        </div>
      </section>

      <section className="panel role-landing-panel">
        <div className="role-landing-content">
          <span>APIShield</span>

          <h3>{title}</h3>

          <p>
            This workspace is ready for the features assigned to this account role.
          </p>
        </div>
      </section>
    </DashboardLayout>
  );
}