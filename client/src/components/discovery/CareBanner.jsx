import { ArrowUpRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../constants.js";
import { Button } from "../ui/index.js";

export default function CareBanner() {
  const navigate = useNavigate();
  return (
    <section className="care-banner">
      <div className="banner-sparkle">
        <Sparkles size={26} />
      </div>
      <div>
        <span className="eyebrow">YOUR HEALTH, YOUR PACE</span>
        <h2>
          Care should feel
          <br />
          <em>like a conversation.</em>
        </h2>
        <p>
          No guesswork. No rushed decisions. Just thoughtful people, clear next steps, and care built around
          you.
        </p>
        <Button variant="light" onClick={() => navigate(PATHS.doctors)}>
          Let’s find your doctor <ArrowUpRight size={16} />
        </Button>
      </div>
      <div className="banner-side">
        GOOD CARE IS
        <br />
        ALWAYS PERSONAL.
        <i />
        CAREWELL · DHAKA
        <br />
        EST. FOR YOU
      </div>
    </section>
  );
}
