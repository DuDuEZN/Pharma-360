import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from './RadioGroup';
import { Label } from '../Label/Label';

export default {
  title: 'Design System/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  subcomponents: { RadioGroupItem },
};

export const Default = {
  render: () => {
    const [value, setValue] = useState('option-1');
    return (
      <RadioGroup value={value} onValueChange={setValue}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="radio-1" value="option-1" />
          <Label htmlFor="radio-1">Option 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="radio-2" value="option-2" />
          <Label htmlFor="radio-2">Option 2</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="radio-3" value="option-3" />
          <Label htmlFor="radio-3">Option 3</Label>
        </div>
      </RadioGroup>
    );
  },
};

export const Horizontal = {
  render: () => {
    const [value, setValue] = useState('apple');
    return (
      <RadioGroup value={value} onValueChange={setValue} className="flex space-x-4">
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="radio-h1" value="apple" />
          <Label htmlFor="radio-h1">Apple</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="radio-h2" value="banana" />
          <Label htmlFor="radio-h2">Banana</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="radio-h3" value="orange" />
          <Label htmlFor="radio-h3">Orange</Label>
        </div>
      </RadioGroup>
    );
  },
};

export const Disabled = {
  render: () => {
    const [value, setValue] = useState('option-1');
    return (
      <RadioGroup value={value} onValueChange={setValue} disabled>
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="radio-d1" value="option-1" />
          <Label htmlFor="radio-d1">Disabled Option 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="radio-d2" value="option-2" />
          <Label htmlFor="radio-d2">Disabled Option 2</Label>
        </div>
      </RadioGroup>
    );
  },
};
