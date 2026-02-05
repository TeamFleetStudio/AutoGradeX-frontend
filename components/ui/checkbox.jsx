import * as React from "react"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    checked={checked}
    onChange={(e) => onCheckedChange ? onCheckedChange(e.target.checked) : undefined}
    className={`h-4 w-4 rounded border border-slate-300 accent-blue-600 cursor-pointer ${className}`}
    {...props}
  />
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
