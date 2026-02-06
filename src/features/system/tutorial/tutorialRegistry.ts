import { DriveStep } from 'driver.js';

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: DriveStep[];
}

export const TUTORIALS: Record<string, Tutorial> = {
  APP_NAVIGATION: {
    id: 'APP_NAVIGATION',
    title: 'App Navigation',
    description: 'Learn how to navigate the Ekrixi AI interface.',
    steps: [
      {
        element: 'aside nav',
        popover: {
          title: 'Sidebar Navigation',
          description:
            'Use these icons to switch between different tools like the Universe Generator, Scanner, and Refinery.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[href="/nexus"]',
        popover: {
          title: 'Nexus',
          description: 'The Universe Generator. Start here to create your world context.',
        },
      },
      {
        element: '[href="/scanner"]',
        popover: {
          title: 'Scanner',
          description: 'Ingest raw text and extract entities from it.',
        },
      },
      {
        element: '[href="/refinery"]',
        popover: {
          title: 'Refinery',
          description: 'Review and refine entities before adding them to your registry.',
        },
      },
      {
        element: '[href="/explore"]',
        popover: {
          title: 'Explorer',
          description: 'Visualize your knowledge graph and find connections.',
        },
      },
      {
        element: '[href="/settings"]',
        popover: {
          title: 'Settings',
          description: 'Configure your theme, manage data, and more.',
        },
      },
    ],
  },
  UNIVERSE_GENERATOR: {
    id: 'UNIVERSE_GENERATOR',
    title: 'Universe Generator',
    description: 'Create your first universe with the Big Bang.',
    steps: [
      {
        element: '#universe-prompt-input', // Needs to be added to UI
        popover: {
          title: 'Universe Prompt',
          description:
            'Describe the genre, theme, or core concept of the universe you want to create.',
        },
      },
      {
        element: '#universe-send-button', // Needs to be added to UI
        popover: {
          title: 'Big Bang',
          description: "Click here to generate your universe's foundational lore.",
        },
      },
    ],
  },
};
