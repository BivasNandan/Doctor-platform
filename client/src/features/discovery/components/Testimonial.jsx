import { TESTIMONIAL } from "../content.js";

export default function Testimonial() {
  return (
    <section className="community-quote">
      <span className="eyebrow">KIND WORDS, REAL PEOPLE</span>
      <h2>
        Feeling better starts
        <br />
        with <em>feeling heard.</em>
      </h2>
      <blockquote>“{TESTIMONIAL.quote}”</blockquote>
      <div className="quote-author">
        <img src={TESTIMONIAL.avatar} alt="" loading="lazy" />
        <span>
          <strong>{TESTIMONIAL.author}</strong>
          <small>{TESTIMONIAL.detail}</small>
        </span>
        <b>★★★★★</b>
      </div>
    </section>
  );
}
