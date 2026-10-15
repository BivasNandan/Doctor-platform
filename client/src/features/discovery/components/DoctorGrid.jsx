import { EmptyState, ErrorState, SkeletonGrid } from "../../../components/ui";
import DoctorCard from "./DoctorCard.jsx";

/**
 * Doctor results with loading, error and empty states.
 * @param {{doctors?: object[], loading: boolean, error?: Error|null, onRetry?: () => void,
 *   onBook: (doctor: object) => void, emptyTitle?: string, emptyDescription?: string,
 *   emptyAction?: import('react').ReactNode, className?: string, skeletons?: number}} props
 */
export default function DoctorGrid({
  doctors,
  loading,
  error,
  onRetry,
  onBook,
  emptyTitle = "No doctors to show",
  emptyDescription = "Try searching for another specialty or location.",
  emptyAction,
  className = "",
  skeletons = 3,
}) {
  if (error && !doctors?.length) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading && !doctors?.length) return <SkeletonGrid count={skeletons} />;
  if (!doctors?.length)
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  return (
    <div className={`doctor-grid ${className}`.trim()} aria-busy={loading}>
      {doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} onBook={onBook} />
      ))}
    </div>
  );
}
