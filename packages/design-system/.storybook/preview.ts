import type { Preview } from '@storybook/react-vite'
import { withThemeByClassName } from '@storybook/addon-themes'

import '../src/globals.css'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Run automated accessibility checks on every story.
    // Switch to 'error' to fail CI on violations.
    a11y: { test: 'todo' },
  },
  // Toggle the design-system light/dark token sets via the `.dark` class.
  decorators: [
    withThemeByClassName({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
    }),
  ],
}

export default preview
