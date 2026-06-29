import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Switch } from './switch.js'

describe('Switch', () => {
  it('exposes the switch role and starts unchecked', () => {
    render(<Switch aria-label="Notifications" />)
    expect(screen.getByRole('switch', { name: 'Notifications' })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('toggles on click and reports the change', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Switch aria-label="Notifications" onCheckedChange={onCheckedChange} />)
    const toggle = screen.getByRole('switch')

    await user.click(toggle)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('is operable with the keyboard', async () => {
    const user = userEvent.setup()
    render(<Switch aria-label="Notifications" />)
    const toggle = screen.getByRole('switch')

    await user.tab()
    expect(toggle).toHaveFocus()
    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(
      <Switch aria-label="Notifications" disabled onCheckedChange={onCheckedChange} />
    )
    await user.click(screen.getByRole('switch'))
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
