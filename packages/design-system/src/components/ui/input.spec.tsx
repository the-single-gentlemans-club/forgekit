import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Input } from './input.js'

describe('Input', () => {
  it('renders a textbox and accepts typing', async () => {
    const user = userEvent.setup()
    render(<Input aria-label="Email" placeholder="you@company.com" />)
    const input = screen.getByRole('textbox', { name: 'Email' })
    await user.type(input, 'rich@forgekit.cloud')
    expect(input).toHaveValue('rich@forgekit.cloud')
  })

  it('reflects the invalid state', () => {
    render(<Input aria-label="Email" aria-invalid />)
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
      'aria-invalid',
      'true'
    )
  })

  it('can be disabled', () => {
    render(<Input aria-label="Email" disabled />)
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeDisabled()
  })
})
