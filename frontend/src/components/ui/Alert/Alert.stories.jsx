import React from 'react';
import { Alert } from './Alert';

export default {
  title: 'Design System/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'error'],
    },
    title: {
      control: { type: 'text' },
    },
    onClose: {
      control: { type: 'boolean' },
    },
  },
};

export const Info = {
  args: {
    variant: 'info',
    title: 'Information',
    children: 'This is an informational message.',
  },
};

export const Success = {
  args: {
    variant: 'success',
    title: 'Success',
    children: 'Your action was completed successfully.',
  },
};

export const Warning = {
  args: {
    variant: 'warning',
    title: 'Warning',
    children: 'Please be careful with this action.',
  },
};

export const Error = {
  args: {
    variant: 'error',
    title: 'Error',
    children: 'An error occurred. Please try again.',
  },
};

export const WithCloseButton = {
  args: {
    variant: 'info',
    title: 'Dismissible Alert',
    children: 'Click the close button to dismiss this alert.',
    onClose: () => console.log('Alert closed'),
  },
};

export const WithoutTitle = {
  args: {
    variant: 'success',
    children: 'This is an alert without a title.',
  },
};
