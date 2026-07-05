import type { Meta, StoryObj } from '@storybook/react-vite'

import { Input } from './input'

const meta = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  args: { placeholder: 'you@company.com' },
  argTypes: { disabled: { control: 'boolean' } },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { 'aria-label': 'Email' } }

export const Invalid: Story = {
  args: { 'aria-label': 'Email', 'aria-invalid': true, defaultValue: 'not-an-email' },
}

export const Disabled: Story = { args: { 'aria-label': 'Email', disabled: true } }
