import React from 'react';
import { Separator } from './Separator';

export default {
  title: 'Design System/Separator',
  component: Separator,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: { type: 'select' },
      options: ['horizontal', 'vertical'],
    },
  },
};

export const Horizontal = {
  args: {
    orientation: 'horizontal',
  },
};

export const Vertical = {
  args: {
    orientation: 'vertical',
    className: 'h-16',
  },
};

export const WithText = {
  render: () => (
    <div className="space-y-4">
      <p>Above the separator</p>
      <Separator />
      <p>Below the separator</p>
    </div>
  ),
};
