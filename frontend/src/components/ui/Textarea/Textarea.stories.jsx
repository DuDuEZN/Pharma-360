import React, { useState } from 'react';
import { Textarea } from './Textarea';
import { Label } from '../Label/Label';

export default {
  title: 'Design System/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: { type: 'text' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
    rows: {
      control: { type: 'number', min: 1, max: 20, step: 1 },
    },
  },
};

export const Default = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Textarea
        placeholder="Enter your text here..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  },
};

export const WithLabel = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="space-y-2">
        <Label htmlFor="textarea-1">Description</Label>
        <Textarea
          id="textarea-1"
          placeholder="Enter description..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    );
  },
};

export const WithRows = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Textarea
        placeholder="Enter your text here..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
      />
    );
  },
};

export const Disabled = {
  render: () => {
    return (
      <Textarea
        placeholder="This textarea is disabled"
        value="Disabled content"
        disabled
      />
    );
  },
};

export const WithError = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="space-y-2">
        <Label htmlFor="textarea-2">Description</Label>
        <Textarea
          id="textarea-2"
          placeholder="Enter description..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border-danger-500"
        />
        <p className="text-sm text-danger-600">Please enter a description</p>
      </div>
    );
  },
};
