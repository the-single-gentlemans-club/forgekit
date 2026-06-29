import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Badge } from './badge.js'

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies the destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>)
    expect(screen.getByText('Error')).toHaveClass('bg-destructive')
  })

  it('supports asChild rendering', () => {
    render(
      <Badge asChild>
        <a href="/status">Status</a>
      </Badge>
    )
    expect(screen.getByRole('link', { name: 'Status' })).toHaveAttribute('href', '/status')
  })
})
