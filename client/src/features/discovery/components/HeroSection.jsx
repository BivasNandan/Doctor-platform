import { Check, ShieldCheck } from "lucide-react";
import { Avatar } from "../../../components/ui";
import { HERO_AVATARS, HERO_IMAGE } from "../content.js";

/** Home-page hero. `doctor` is the profile highlighted in the floating card. */
export default function HeroSection({ doctor }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">
          <i /> CARE THAT MEETS YOU HERE
        </span>
        <h1>
          Good care starts
          <br />
          with{" "}
          <em>
            the right
            <br />
            connection.
          </em>
        </h1>
        <p>
          Meet trusted doctors who listen, understand, and help you feel your best — wherever you are in your
          health journey.
        </p>
        <div className="hero-proof">
          <div className="avatar-stack">
            {HERO_AVATARS.map((src) => (
              <img key={src} src={src} alt="" loading="lazy" />
            ))}
          </div>
          <span>
            <strong>
              ★★★★★ <b>4.9/5</b>
            </strong>
            <small>Loved by 12,000+ patients</small>
          </span>
        </div>
      </div>
      <div className="hero-visual">
        <div className="hero-image-wrap">
          <img className="hero-image" src={HERO_IMAGE} alt="Doctor in a calm, welcoming clinic" />
          <div className="hero-image-overlay" />
          <div className="floating-note note-top">
            <span className="note-icon">
              <ShieldCheck size={18} />
            </span>
            <span>
              <strong>Care you can trust</strong>
              <small>Doctors, thoughtfully verified</small>
            </span>
            <span className="note-check">
              <Check size={15} />
            </span>
          </div>
          {doctor && (
            <div className="floating-note note-bottom">
              <Avatar src={doctor.image} name={doctor.name} />
              <span>
                <strong>{doctor.name}</strong>
                <small>
                  {doctor.specialty} · {doctor.experienceYears} years
                </small>
              </span>
            </div>
          )}
          <span className="image-stamp">CW—01</span>
        </div>
        <div className="hero-caption">
          <span>
            <i /> A LITTLE MORE HUMAN, BY DESIGN
          </span>
          <span>01 / 03</span>
        </div>
      </div>
    </section>
  );
}
