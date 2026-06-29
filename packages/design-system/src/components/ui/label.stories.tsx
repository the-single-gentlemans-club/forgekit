import type { Meta, StoryObj } from '@storybook/react-vite'

import { Label } from './label'
import { Input } from './input'

const meta = {
  title: 'Components/Label',
  component: Label,
  tags: ['autodocs'],
  args: { children: 'Email' },
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithInput: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@company.com" />
    </div>
  ),
}
