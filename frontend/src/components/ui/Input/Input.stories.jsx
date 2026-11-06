import React from 'react';
import { Input } from './Input';
import { Search, Mail, Lock } from 'lucide-react';

export default {
  title: 'Design System/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'password', 'email', 'number', 'search'],
    },
    label: {
      control: { type: 'text' },
    },
    placeholder: {
      control: { type: 'text' },
    },
    error: {
      control: { type: 'text' },
    },
    hint: {
      control: { type: 'text' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export const Default = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel = {
  args: {
    label: 'Username',
    placeholder: 'Enter your username',
  },
};

export const WithLeftIcon = {
  args: {
    label: 'Search',
    placeholder: 'Search products...',
    leftIcon: Search,
  },
};

export const WithRightIcon = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    rightIcon: Mail,
  },
};

export const Password = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
  },
};

export const WithError = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    error: 'Please enter a valid email address',
  },
};

export const WithHint = {
  args: {
    label: 'Username',
    placeholder: 'Enter your username',
    hint: 'Must be at least 3 characters',
  },
};

export const Disabled = {
  args: {
    label: 'Disabled Input',
    placeholder: 'This input is disabled',
    disabled: true,
  },
};

export const Email = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'user@example.com',
    leftIcon: Mail,
  },
};

export const SearchInput = {
  args: {
    label: 'Search',
    type: 'search',
    placeholder: 'Search products...',
    leftIcon: Search,
  },
};
