import { motion, useReducedMotion } from "framer-motion";

/** Reveals a content block once as it enters the viewport. */
export default function ScrollReveal({ children, className = "" }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: reduceMotion ? 0 : 0.38, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
