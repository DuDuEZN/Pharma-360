import React from 'react';
import { Button } from './Button';
import { Search, Plus, Trash2 } from 'lucide-react';

export default {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success', 'warning', 'link'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    isLoading: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export const Primary = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Outline = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

export const Ghost = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Danger = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
};

export const Success = {
  args: {
    children: 'Success Button',
    variant: 'success',
  },
};

export const Warning = {
  args: {
    children: 'Warning Button',
    variant: 'warning',
  },
};

export const Link = {
  args: {
    children: 'Link Button',
    variant: 'link',
  },
};

export const WithLeftIcon = {
  args: {
    children: 'Search',
    leftIcon: Search,
    variant: 'primary',
  },
};

export const WithRightIcon = {
  args: {
    children: 'Add',
    rightIcon: Plus,
    variant: 'success',
  },
};

export const Loading = {
  args: {
    children: 'Loading...',
    isLoading: true,
    variant: 'primary',
  },
};

export const Disabled = {
  args: {
    children: 'Disabled',
    disabled: true,
    variant: 'primary',
  },
};

export const Small = {
  args: {
    children: 'Small',
    size: 'sm',
    variant: 'primary',
  },
};

export const Medium = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'primary',
  },
};

export const Large = {
  args: {
    children: 'Large',
    size: 'lg',
    variant: 'primary',
  },
};
