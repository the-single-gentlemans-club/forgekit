import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card.js'

describe('Card', () => {
  it('renders the composed structure with a heading', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Manage your plan</CardDescription>
        </CardHeader>
        <CardContent>Usage this month</CardContent>
        <CardFooter>Upgrade</CardFooter>
      </Card>
    )
    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument()
    expect(screen.getByText('Manage your plan')).toBeInTheDocument()
    expect(screen.getByText('Usage this month')).toBeInTheDocument()
    expect(screen.getByText('Upgrade')).toBeInTheDocument()
  })
})
