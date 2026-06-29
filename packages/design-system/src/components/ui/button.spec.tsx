import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Button } from './button.js'

describe('Button', () => {
  it('renders a button with its label', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('applies the default variant classes', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
  })

  it('renders as its child element when asChild is set (Slot.Root)', () => {
    render(
      <Button asChild>
        <a href="/dashboard">Dashboard</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: 'Dashboard' })
    expect(link).toHaveAttribute('href', '/dashboard')
    // Slot merges the button styling onto the anchor.
    expect(link).toHaveClass('bg-primary')
  })

  it('fires onClick and respects disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Go</Button>)

    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>
    )
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
