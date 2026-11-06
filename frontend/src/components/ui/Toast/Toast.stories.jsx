import React from 'react';
import { Toast, ToastProvider, ToastViewport, useToast } from './Toast';
import { Button } from '../Button/Button';

function ToastDemo() {
  const { toast } = useToast();

  return (
    <div className="space-y-2">
      <Button onClick={() => toast({ title: 'Success', description: 'Your action was completed successfully.' })}>
        Show Success Toast
      </Button>
      <Button variant="danger" onClick={() => toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'destructive' })}>
        Show Error Toast
      </Button>
      <Button variant="outline" onClick={() => toast({ title: 'Info', description: 'This is an informational message.' })}>
        Show Info Toast
      </Button>
    </div>
  );
}

export default {
  title: 'Design System/Toast',
  component: Toast,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
        <ToastViewport />
      </ToastProvider>
    ),
  ],
};

export const Default = {
  render: () => <ToastDemo />,
};
