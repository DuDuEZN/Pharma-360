import React, { useState } from 'react';
import { Checkbox } from './Checkbox';
import { Label } from '../Label/Label';

export default {
  title: 'Design System/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export const Default = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex items-center space-x-2">
        <Checkbox id="checkbox-1" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="checkbox-1">Accept terms and conditions</Label>
      </div>
    );
  },
};

export const WithLabel = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex items-center space-x-2">
        <Checkbox id="checkbox-2" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="checkbox-2">Enable notifications</Label>
      </div>
    );
  },
};

export const Disabled = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <div className="flex items-center space-x-2">
        <Checkbox id="checkbox-3" checked={checked} onCheckedChange={setChecked} disabled />
        <Label htmlFor="checkbox-3">Disabled checkbox</Label>
      </div>
    );
  },
};

export const MultipleCheckboxes = {
  render: () => {
    const [checked1, setChecked1] = useState(false);
    const [checked2, setChecked2] = useState(false);
    const [checked3, setChecked3] = useState(false);
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox id="checkbox-m1" checked={checked1} onCheckedChange={setChecked1} />
          <Label htmlFor="checkbox-m1">Option 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="checkbox-m2" checked={checked2} onCheckedChange={setChecked2} />
          <Label htmlFor="checkbox-m2">Option 2</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="checkbox-m3" checked={checked3} onCheckedChange={setChecked3} />
          <Label htmlFor="checkbox-m3">Option 3</Label>
        </div>
      </div>
    );
  },
};
