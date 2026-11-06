import React from 'react';
import { Progress } from './Progress';

export default {
  title: 'Design System/Progress',
  component: Progress,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'number', min: 0, max: 100, step: 1 },
    },
    max: {
      control: { type: 'number', min: 1, max: 1000, step: 1 },
    },
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'warning', 'danger'],
    },
    showLabel: {
      control: { type: 'boolean' },
    },
  },
};

export const Default = {
  args: {
    value: 50,
    max: 100,
    size: 'md',
    variant: 'primary',
  },
};

export const WithLabel = {
  args: {
    value: 75,
    max: 100,
    size: 'md',
    variant: 'primary',
    showLabel: true,
    label: 'Upload Progress',
  },
};

export const Success = {
  args: {
    value: 100,
    max: 100,
    size: 'md',
    variant: 'success',
    showLabel: true,
    label: 'Complete',
  },
};

export const Warning = {
  args: {
    value: 80,
    max: 100,
    size: 'md',
    variant: 'warning',
    showLabel: true,
    label: 'Almost there',
  },
};

export const Danger = {
  args: {
    value: 20,
    max: 100,
    size: 'md',
    variant: 'danger',
    showLabel: true,
    label: 'Low',
  },
};

export const ExtraSmall = {
  args: {
    value: 50,
    max: 100,
    size: 'xs',
    variant: 'primary',
  },
};

export const Small = {
  args: {
    value: 50,
    max: 100,
    size: 'sm',
    variant: 'primary',
  },
};

export const Large = {
  args: {
    value: 50,
    max: 100,
    size: 'lg',
    variant: 'primary',
  },
};

export const ExtraLarge = {
  args: {
    value: 50,
    max: 100,
    size: 'xl',
    variant: 'primary',
  },
};
