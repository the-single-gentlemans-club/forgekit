import type { Meta, StoryObj } from '@storybook/react-vite'

import { Field } from './field'
import { Input } from './input'

const meta = {
  title: 'Components/Field',
  component: Field,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Field label="Email" className="w-80">
      <Input type="email" placeholder="you@company.com" />
    </Field>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <Field label="Email" description="We only use this to contact you." className="w-80">
      <Input type="email" placeholder="you@company.com" />
    </Field>
  ),
}

export const WithError: Story = {
  render: () => (
    <Field label="Email" error="Enter a valid email address." className="w-80">
      <Input type="email" defaultValue="not-an-email" />
    </Field>
  ),
}

export const Required: Story = {
  render: () => (
    <Field label="Email" required description="Required to create your account." className="w-80">
      <Input type="email" placeholder="you@company.com" />
    </Field>
  ),
}
