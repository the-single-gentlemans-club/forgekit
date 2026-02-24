import type { Preview } from '@storybook/react'
import React from 'react'

// Import your global styles if any
// import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [(Story) => <Story />],
}

export default preview
