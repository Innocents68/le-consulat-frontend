export function Field({ label, children, error, required, hint }) {
  return (
    <div className="mb-3">
      {label && (
        <label className="label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-light/70 mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

export function Select({ children, className = '', ...props }) {
  return (
    <select className={`input ${className}`} {...props}>
      {children}
    </select>
  );
}

export function TextArea(props) {
  return <textarea className="input min-h-[80px]" {...props} />;
}
