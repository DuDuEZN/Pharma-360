import React, { useState } from 'react';
import { Switch } from './Switch';
import { Label } from '../Label/Label';

export default {
  title: 'Design System/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: { type: 'boolean' },
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
};

export const Default = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex items-center space-x-2">
        <Switch id="switch-1" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="switch-1">Enable feature</Label>
      </div>
    );
  },
};

export const Small = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex items-center space-x-2">
        <Switch id="switch-2" size="sm" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="switch-2">Small switch</Label>
      </div>
    );
  },
};

export const Large = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex items-center space-x-2">
        <Switch id="switch-3" size="lg" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="switch-3">Large switch</Label>
      </div>
    );
  },
};

export const Disabled = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <div className="flex items-center space-x-2">
        <Switch id="switch-4" checked={checked} onCheckedChange={setChecked} disabled />
        <Label htmlFor="switch-4">Disabled switch</Label>
      </div>
    );
  },
};
