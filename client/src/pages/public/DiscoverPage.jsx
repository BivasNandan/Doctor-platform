import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import CareBanner from "../../components/discovery/CareBanner.jsx";
import DiscoverSearch from "../../components/discovery/DiscoverSearch.jsx";
import HeroSection from "../../components/discovery/HeroSection.jsx";
import Testimonial from "../../components/discovery/Testimonial.jsx";
import TrustStrip from "../../components/discovery/TrustStrip.jsx";
import DoctorGrid from "../../components/doctors/DoctorGrid.jsx";
import { ScrollReveal } from "../../components/ui/index.js";
import { PATHS } from "../../constants.js";
import { useBooking } from "../../context/BookingContext.jsx";
import { useResource } from "../../hooks/useResource.js";
import { doctorService } from "../../services/index.js";

export default function DiscoverPage() {
  const { openBooking } = useBooking();
  const { data: doctors, loading, error, reload } = useResource(() => doctorService.list(), []);
  const featured = doctors?.slice(0, 3);

  return (
    <>
      <ScrollReveal>
        <HeroSection />
      </ScrollReveal>
      <ScrollReveal>
        <DiscoverSearch />
      </ScrollReveal>
      <ScrollReveal>
        <TrustStrip />
      </ScrollReveal>
      <ScrollReveal>
        <section className="featured-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A GOOD PLACE TO BEGIN</span>
              <h2>
                Doctors patients <em>love.</em>
              </h2>
              <p>A few of the kind, skilled people making a difference in Dhaka.</p>
            </div>
            <Link className="text-link" to={PATHS.doctors}>
              Explore all doctors <ArrowUpRight size={15} />
            </Link>
          </div>
          <DoctorGrid
            doctors={featured}
            loading={loading}
            error={error}
            onRetry={reload}
            onBook={openBooking}
            emptyAction={
              <Link className="button button-primary" to={PATHS.doctors}>
                Browse all doctors
              </Link>
            }
          />
          <div className="doctor-bottom">
            <span>
              <i /> Platform verified professionals
            </span>
            <Link className="text-link" to={PATHS.doctors}>
              See all specialists <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </ScrollReveal>
      <ScrollReveal>
        <CareBanner />
      </ScrollReveal>
      <ScrollReveal>
        <Testimonial />
      </ScrollReveal>
    </>
  );
}
