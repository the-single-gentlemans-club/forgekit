import type { Meta, StoryObj } from '@storybook/react-vite'

import { Switch } from './switch'
import { Label } from './label'

const meta = {
  title: 'Components/Switch',
  component: Switch,
  tags: ['autodocs'],
  args: { 'aria-label': 'Airplane mode' },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Checked: Story = { args: { defaultChecked: true } }
export const Disabled: Story = { args: { disabled: true } }

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="airplane" />
      <Label htmlFor="airplane">Airplane mode</Label>
    </div>
  ),
}
