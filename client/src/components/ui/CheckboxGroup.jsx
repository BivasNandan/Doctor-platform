/** Group of checkboxes sharing one `name` (read with FormData.getAll). */
export default function CheckboxGroup({ legend, name, options, defaultValue = [], disabled, error }) {
  return (
    <fieldset className="check-group" disabled={disabled}>
      <legend>{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value} className="check-option">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={defaultValue.includes(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
}
