import { useState, useRef, useEffect } from 'react'

function CustomSelect({ value, onChange, options, className = '', defaultValue, ariaLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const hasPlaceholder = defaultValue !== undefined
  const placeholderLabel = hasPlaceholder
    ? (options.find(o => o.value === defaultValue)?.label || ariaLabel || '')
    : (ariaLabel || '')
  const isDefault = hasPlaceholder && value === defaultValue
  const realOptions = hasPlaceholder
    ? options.filter(o => o.value !== defaultValue)
    : options

  const selected = options.find(o => o.value === value)
  const displayLabel = selected?.label || placeholderLabel

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSelect = (opt) => {
    onChange(opt.value)
    setOpen(false)
  }

  return (
    <div className={`cselect ${className}`} ref={ref} aria-label={ariaLabel}>
      <button
        type="button"
        className={`cselect-trigger ${isDefault ? 'is-placeholder' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="cselect-label">{displayLabel}</span>
        <svg className="cselect-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="cselect-dropdown">
          <div className="cselect-dropdown-header">
            <button
              type="button"
              className="cselect-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          {realOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`cselect-option ${opt.value === value ? 'active' : ''}`}
              onClick={() => handleSelect(opt)}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
