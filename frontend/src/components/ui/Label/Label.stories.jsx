import React from 'react';
import { Label } from './Label';
import { Input } from '../Input/Input';

export default {
  title: 'Design System/Label',
  component: Label,
  tags: ['autodocs'],
  argTypes: {
    htmlFor: {
      control: { type: 'text' },
    },
  },
};

export const Default = {
  args: {
    children: 'Label',
    htmlFor: 'input-1',
  },
};

export const WithInput = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="input-2">Username</Label>
      <Input id="input-2" placeholder="Enter username" />
    </div>
  ),
};

export const Required = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="input-3">
        Email <span className="text-danger-500">*</span>
      </Label>
      <Input id="input-3" placeholder="Enter email" type="email" />
    </div>
  ),
};

export const Small = {
  args: {
    children: 'Small Label',
    htmlFor: 'input-4',
    className: 'text-sm',
  },
};

export const Large = {
  args: {
    children: 'Large Label',
    htmlFor: 'input-5',
    className: 'text-lg',
  },
};
