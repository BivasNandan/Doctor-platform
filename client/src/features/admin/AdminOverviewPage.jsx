import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Hospital,
  LifeBuoy,
  ListFilter,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState, PageLoader, Pill, SectionHeading } from "../../components/ui.jsx";
import { isDemoMode, PATHS, VERIFICATION_STATUS } from "../../constants.js";
import { useResource } from "../../hooks.js";
import { adminService } from "../../services/index.js";

const SHORTCUTS = [
  [PATHS.adminDoctors, "Doctor management", Stethoscope],
  [PATHS.adminVerification, "Verification review", ShieldCheck],
  [PATHS.adminFacilities, "Facility management", Hospital],
  [PATHS.adminAppointments, "Appointment management", CalendarDays],
  [PATHS.adminSpecialties, "Manage specialties", ListFilter],
  [PATHS.adminAvailability, "Update availability", Clock3],
  [PATHS.adminSupport, "Support requests", LifeBuoy],
  [PATHS.adminDeactivationRequests, "Deactivation review", UserRound],
];

const monthInitial = (month) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString("en", { month: "narrow" });
const monthName = (month) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString("en", { month: "long", year: "numeric" });

export default function AdminOverviewPage() {
  const summary = useResource(() => adminService.getSummary(), []);
  const doctors = useResource(() => adminService.listDoctors(), []);

  if (summary.error && !summary.data) return <ErrorState error={summary.error} onRetry={summary.reload} />;
  if (!summary.data) return <PageLoader />;

  const stats = summary.data;
  const series = stats.monthlyAppointments;
  const peak = Math.max(1, ...series.map((point) => point.count));
  const total = series.reduce((sum, point) => sum + point.count, 0);
  const pending = (doctors.data ?? []).filter(
    (doctor) => doctor.verificationStatus === VERIFICATION_STATUS.PENDING,
  );

  const cards = [
    ["Appointments today", stats.appointmentsToday, "Scheduled for today", CalendarDays],
    ["Verified doctors", stats.verifiedDoctors, `Across ${stats.activeSpecialties} specialties`, Stethoscope],
    ["Awaiting review", stats.pendingDoctors, "Needs your attention", ShieldCheck, true],
    ["Active facilities", stats.activeFacilities, "Clinics and hospitals", Hospital],
  ];

  return (
    <>
      <SectionHeading
        eyebrow="THE CAREWELL PULSE"
        title={
          <>
            A calmer way to <em>care for care.</em>
          </>
        }
        description="A clear view of what’s happening across your health network today."
        action={
          <Pill tone={isDemoMode ? "pending" : "available"}>
            <i /> {isDemoMode ? "Demo data" : "Live data"}
          </Pill>
        }
      />
      <div className="admin-stats">
        {cards.map(([title, value, sub, Icon, warn]) => (
          <article className="metric-card surface" key={title}>
            <div>
              <span>{title}</span>
              <Icon size={17} />
            </div>
            <strong>{value}</strong>
            <small className={warn ? "warning-copy" : ""}>{sub}</small>
          </article>
        ))}
      </div>
      <div className="admin-grid">
        <section className="admin-panel surface">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">APPOINTMENT ACTIVITY</span>
              <h3>A steady rhythm of care.</h3>
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i /> Visits, last 12 months
            </span>
            <strong>{total.toLocaleString()}</strong>
          </div>
          <div className="bar-chart" role="img" aria-label="Monthly appointments chart">
            {series.map((point) => (
              <div key={point.month}>
                <i
                  style={{ height: `${(point.count / peak) * 100}%` }}
                  title={`${monthName(point.month)}: ${point.count} appointments`}
                />
                <small>{monthInitial(point.month)}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-panel surface">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">NEEDS YOUR EYE</span>
              <h3>For review.</h3>
            </div>
            <Link className="text-link" to={PATHS.adminVerification}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {pending.slice(0, 3).map((doctor) => (
            <div className="review-queue" key={doctor.id}>
              <span className="review-avatar">{doctor.name.replace(/^Dr\.?\s+/i, "")[0]}</span>
              <span>
                <strong>{doctor.name}</strong>
                <small>{doctor.specialty}</small>
              </span>
              <Pill tone="pending">Pending</Pill>
            </div>
          ))}
          {!pending.length && <p className="privacy-note">No profiles are waiting for review.</p>}
          <Link className="button button-outline" to={PATHS.adminVerification}>
            Review all applications <ArrowRight size={14} />
          </Link>
        </section>
      </div>
      <div className="admin-shortcuts">
        <span className="eyebrow">QUICK ACTIONS</span>
        <div>
          {SHORTCUTS.map(([to, label, Icon]) => (
            <Link key={to} to={to} className="admin-shortcut">
              <Icon size={17} />
              <span>{label}</span>
              <ArrowUpRight size={14} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
