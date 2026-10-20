/** External stock imagery. Host these in /public/images for production. */
export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1000&q=85";

export const HERO_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&crop=faces",
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
