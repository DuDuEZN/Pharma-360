import React, { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from './Popover';
import { Button } from '../Button/Button';

export default {
  title: 'Design System/Popover',
  component: Popover,
  tags: ['autodocs'],
  subcomponents: { PopoverTrigger, PopoverContent },
};

export const Default = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">Open Popover</Button>
        </PopoverTrigger>
        <PopoverContent>
          <div className="space-y-2">
            <h4 className="font-medium">Popover Title</h4>
            <p className="text-sm text-gray-600">This is the popover content.</p>
          </div>
        </PopoverContent>
      </Popover>
    );
  },
};

export const WithForm = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">Open Form</Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <h4 className="font-medium">Settings</h4>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input className="w-full p-2 border rounded" placeholder="Enter name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input className="w-full p-2 border rounded" placeholder="Enter email" />
            </div>
            <Button size="sm">Save</Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  },
};

export const WithPosition = {
  render: () => (
    <div className="flex gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Top</Button>
        </PopoverTrigger>
        <PopoverContent side="top">
          Popover on top
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Right</Button>
        </PopoverTrigger>
        <PopoverContent side="right">
          Popover on right
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Bottom</Button>
        </PopoverTrigger>
        <PopoverContent side="bottom">
          Popover on bottom
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Left</Button>
        </PopoverTrigger>
        <PopoverContent side="left">
          Popover on left
        </PopoverContent>
      </Popover>
    </div>
  ),
};
