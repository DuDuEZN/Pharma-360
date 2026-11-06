import React, { useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectSeparator, SelectGroup, SelectLabel } from './Select';

export default {
  title: 'Design System/Select',
  component: Select,
  tags: ['autodocs'],
  subcomponents: { SelectTrigger, SelectValue, SelectContent, SelectItem, SelectSeparator, SelectGroup, SelectLabel },
};

export const Default = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
          <SelectItem value="grape">Grape</SelectItem>
        </SelectContent>
      </Select>
    );
  },
};

export const WithDefaultValue = {
  render: () => {
    const [value, setValue] = useState('banana');
    return (
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
        </SelectContent>
      </Select>
    );
  },
};

export const WithGroups = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Medicines</SelectLabel>
            <SelectItem value="paracetamol">Paracetamol</SelectItem>
            <SelectItem value="amoxicillin">Amoxicillin</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Supplements</SelectLabel>
            <SelectItem value="vitamin-c">Vitamin C</SelectItem>
            <SelectItem value="vitamin-d">Vitamin D</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  },
};

export const Disabled = {
  render: () => {
    return (
      <Select value="apple" disabled>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );
  },
};

export const WithError = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="space-y-2">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="w-[180px] border-danger-500">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-danger-600">Please select a fruit</p>
      </div>
    );
  },
};
