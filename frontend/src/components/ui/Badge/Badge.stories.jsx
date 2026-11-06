import React from 'react';
import { Badge } from './Badge';

export default {
  title: 'Design System/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'danger', 'info'],
    },
  },
};

export const Default = {
  args: {
    children: 'Default',
    variant: 'default',
  },
};

export const Primary = {
  args: {
    children: 'Primary',
    variant: 'primary',
  },
};

export const Secondary = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

export const Success = {
  args: {
    children: 'Success',
    variant: 'success',
  },
};

export const Warning = {
  args: {
    children: 'Warning',
    variant: 'warning',
  },
};

export const Danger = {
  args: {
    children: 'Danger',
    variant: 'danger',
  },
};

export const Info = {
  args: {
    children: 'Info',
    variant: 'info',
  },
};
