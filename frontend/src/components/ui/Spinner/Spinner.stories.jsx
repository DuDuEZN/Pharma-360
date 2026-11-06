import React from 'react';
import { Spinner, LoadingOverlay } from './Spinner';

export default {
  title: 'Design System/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'white', 'black'],
    },
  },
};

export const ExtraSmall = {
  args: {
    size: 'xs',
    variant: 'primary',
  },
};

export const Small = {
  args: {
    size: 'sm',
    variant: 'primary',
  },
};

export const Medium = {
  args: {
    size: 'md',
    variant: 'primary',
  },
};

export const Large = {
  args: {
    size: 'lg',
    variant: 'primary',
  },
};

export const ExtraLarge = {
  args: {
    size: 'xl',
    variant: 'primary',
  },
};

export const Primary = {
  args: {
    size: 'md',
    variant: 'primary',
  },
};

export const Secondary = {
  args: {
    size: 'md',
    variant: 'secondary',
  },
};

export const Success = {
  args: {
    size: 'md',
    variant: 'success',
  },
};

export const Warning = {
  args: {
    size: 'md',
    variant: 'warning',
  },
};

export const Danger = {
  args: {
    size: 'md',
    variant: 'danger',
  },
};

export const WithLabel = {
  args: {
    size: 'md',
    variant: 'primary',
    label: 'Loading data...',
  },
};

export const LoadingOverlayExample = {
  render: () => (
    <LoadingOverlay isLoading={true}>
      <div className="h-40 w-full bg-gray-100 rounded-lg p-4">
        <h3 className="font-semibold">Content being loaded</h3>
        <p className="text-sm text-gray-600">This content will be visible when loading is complete</p>
      </div>
    </LoadingOverlay>
  ),
};
