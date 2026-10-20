export const TESTIMONIAL = {
  quote:
    "For the first time, finding a doctor felt simple. I booked in a few minutes and Dr. Nusrat made me feel completely at ease.",
  author: "Demo patient",
  detail: "Carewell patient · Dhaka",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces",
};

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

/** Static marketing copy and options for the discovery screens. */
