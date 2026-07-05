import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Field } from './field.js'
import { Input } from './input.js'

describe('Field', () => {
  it('associates the label with the control', () => {
    render(
      <Field label="Email">
        <Input />
      </Field>
    )
    // getByLabelText only resolves when the label↔control wiring is correct.
    expect(screen.getByLabelText('Email')).toBeInstanceOf(HTMLInputElement)
  })

  it('links a description via aria-describedby', () => {
    render(
      <Field label="Email" description="We never share it.">
        <Input />
      </Field>
    )
    const input = screen.getByLabelText('Email')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(screen.getByText('We never share it.')).toHaveAttribute('id', describedBy as string)
  })

  it('marks the control invalid and announces the error', () => {
    render(
      <Field label="Email" error="Enter a valid email">
        <Input />
      </Field>
    )
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Enter a valid email')
    expect(input.getAttribute('aria-describedby')).toContain(alert.id)
  })

  it('renders a required indicator', () => {
    render(
      <Field label="Email" required>
        <Input />
      </Field>
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })
})
