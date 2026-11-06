import React, { useState } from 'react';
import { DatePicker } from './DatePicker';
import { Label } from '../Label/Label';

export default {
  title: 'Design System/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: { type: 'boolean' },
    },
    withTime: {
      control: { type: 'boolean' },
    },
  },
};

export const Default = {
  render: () => {
    const [date, setDate] = useState(null);
    return (
      <div className="space-y-2">
        <Label>Select a date</Label>
        <DatePicker date={date} setDate={setDate} />
      </div>
    );
  },
};

export const WithTime = {
  render: () => {
    const [date, setDate] = useState(null);
    return (
      <div className="space-y-2">
        <Label>Select date and time</Label>
        <DatePicker date={date} setDate={setDate} withTime />
      </div>
    );
  },
};

export const WithRange = {
  render: () => {
    const [date, setDate] = useState(null);
    return (
      <div className="space-y-2">
        <Label>Select a date range</Label>
        <DatePicker date={date} setDate={setDate} mode="range" />
      </div>
    );
  },
};

export const Disabled = {
  render: () => {
    const [date, setDate] = useState(new Date());
    return (
      <div className="space-y-2">
        <Label>Disabled date picker</Label>
        <DatePicker date={date} setDate={setDate} disabled />
      </div>
    );
  },
};
