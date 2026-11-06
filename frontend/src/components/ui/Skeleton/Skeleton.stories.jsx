import React from 'react';
import { Skeleton, SkeletonText } from './Skeleton';

export default {
  title: 'Design System/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['text', 'heading', 'paragraph', 'circular', 'rectangular', 'card', 'avatar'],
    },
    circle: {
      control: { type: 'boolean' },
    },
    animated: {
      control: { type: 'boolean' },
    },
  },
};

export const Text = {
  args: {
    variant: 'text',
    animated: true,
  },
};

export const Heading = {
  args: {
    variant: 'heading',
    animated: true,
  },
};

export const Paragraph = {
  args: {
    variant: 'paragraph',
    animated: true,
  },
};

export const Circular = {
  args: {
    variant: 'circular',
    circle: true,
    animated: true,
  },
};

export const Rectangular = {
  args: {
    variant: 'rectangular',
    animated: true,
  },
};

export const Card = {
  args: {
    variant: 'card',
    animated: true,
  },
};

export const Avatar = {
  args: {
    variant: 'avatar',
    circle: true,
    animated: true,
  },
};

export const MultipleLines = {
  render: () => <SkeletonText lines={3} animated={true} />,
};

export const CardSkeleton = {
  render: () => (
    <div className="space-y-4">
      <Skeleton variant="heading" animated={true} />
      <Skeleton variant="paragraph" animated={true} />
      <Skeleton variant="paragraph" animated={true} width="w-3/4" />
    </div>
  ),
};
