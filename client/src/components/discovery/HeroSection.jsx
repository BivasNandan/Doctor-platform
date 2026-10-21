import { assetUrl } from "../../utils/assets.js";

/** Photos in /public/images (credits: docs/IMAGE_CREDITS.md). */
export const HERO_IMAGE = "images/hero/hero-doctor.jpg";

export const HERO_AVATARS = [
  "images/people/patient-1.jpg",
  "images/people/patient-2.jpg",
  "images/people/patient-3.jpg",
];

/** Home-page hero. `doctor` is the profile highlighted in the floating card. */
export default function HeroSection() {
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
              <img key={src} src={assetUrl(src)} alt="" loading="lazy" />
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
          <img className="hero-image" src={assetUrl(HERO_IMAGE)} alt="A smiling doctor in a white coat" />
          <div className="hero-image-overlay" />
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
