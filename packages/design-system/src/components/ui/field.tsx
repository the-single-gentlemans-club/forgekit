import * as React from 'react'

import { cn } from '@/lib/utils'
import { Label } from '@forgekit/design-system'

/**
 * The control element Field wraps. It receives the wired accessibility props
 * (`id`, `aria-invalid`, `aria-describedby`) via cloneElement, so any input,
 * textarea, or select that forwards these attributes works.
 */
type FieldControl = React.ReactElement<{
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}>

type FieldProps = {
  /** Visible label text, associated with the control via `htmlFor`/`id`. */
  label: React.ReactNode
  /** The form control (e.g. `<Input />`). */
  children: FieldControl
  /** Optional helper text, announced to screen readers via `aria-describedby`. */
  description?: React.ReactNode
  /** Error message. When set, marks the control `aria-invalid` and is announced via `role="alert"`. */
  error?: React.ReactNode
  /** Renders a required indicator and is conveyed to assistive tech on the control. */
  required?: boolean
  className?: string
  /** Override the generated id (otherwise `useId` provides a stable one). */
  id?: string
}

/**
 * Field composes a Label, a control, and description/error text with the full
 * accessibility contract wired automatically:
 * label↔control association, `aria-invalid`, `aria-describedby`, and a live
 * error region. `aria-describedby` only references elements that actually
 * render, so there are no dangling references for assistive tech.
 */
function Field({ label, children, description, error, required, className, id }: FieldProps) {
  const generatedId = React.useId()
  const fieldId = id ?? generatedId

  // Description is hidden once an error is shown, so only reference it when visible.
  const showDescription = Boolean(description) && !error
  const descriptionId = showDescription ? `${fieldId}-description` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  const control = React.cloneElement(children, {
    id: fieldId,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  })

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={fieldId}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {control}
      {showDescription ? (
        <p id={descriptionId} className="text-muted-foreground text-xs">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-xs font-medium">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { Field }
export type { FieldProps }
