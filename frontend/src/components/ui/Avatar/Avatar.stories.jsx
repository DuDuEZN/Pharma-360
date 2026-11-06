import React from 'react';
import { Avatar, AvatarGroup } from './Avatar';

export default {
  title: 'Design System/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    status: {
      control: { type: 'select' },
      options: ['online', 'offline', 'busy', 'away', null],
    },
    statusPosition: {
      control: { type: 'select' },
      options: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
    },
  },
};

export const ExtraSmall = {
  args: {
    size: 'xs',
    alt: 'John Doe',
  },
};

export const Small = {
  args: {
    size: 'sm',
    alt: 'John Doe',
  },
};

export const Medium = {
  args: {
    size: 'md',
    alt: 'John Doe',
  },
};

export const Large = {
  args: {
    size: 'lg',
    alt: 'John Doe',
  },
};

export const ExtraLarge = {
  args: {
    size: 'xl',
    alt: 'John Doe',
  },
};

export const WithImage = {
  args: {
    size: 'md',
    src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    alt: 'User avatar',
  },
};

export const WithFallback = {
  args: {
    size: 'md',
    alt: 'John Doe',
  },
};

export const WithCustomFallback = {
  args: {
    size: 'md',
    fallback: 'JD',
    alt: 'John Doe',
  },
};

export const WithStatusOnline = {
  args: {
    size: 'md',
    alt: 'John Doe',
    status: 'online',
  },
};

export const WithStatusOffline = {
  args: {
    size: 'md',
    alt: 'John Doe',
    status: 'offline',
  },
};

export const WithStatusBusy = {
  args: {
    size: 'md',
    alt: 'John Doe',
    status: 'busy',
  },
};

export const WithStatusAway = {
  args: {
    size: 'md',
    alt: 'John Doe',
    status: 'away',
  },
};

export const AvatarGroupExample = {
  render: () => (
    <AvatarGroup max={3}>
      <Avatar alt="John Doe" />
      <Avatar alt="Jane Smith" />
      <Avatar alt="Bob Johnson" />
      <Avatar alt="Alice Williams" />
      <Avatar alt="Charlie Brown" />
    </AvatarGroup>
  ),
};
