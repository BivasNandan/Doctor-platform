/**
 * @param {{variant?: 'primary'|'outline'|'light', type?: 'button'|'submit'|'reset'}} props
 */
export default function Button({ children, variant = "primary", className = "", type = "button", ...props }) {
  return (
    <button type={type} className={`button button-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
