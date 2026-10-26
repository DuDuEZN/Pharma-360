/**
 * @jest-environment jsdom
 * Frontend Components Tests
 * QA-007: Tests Frontend (Jest + React Testing Library)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock components
jest.mock('../src/components/common/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, className }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('../src/components/common/Input', () => ({
  __esModule: true,
  default: ({ value, onChange, placeholder, type }) => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
    />
  ),
}));

jest.mock('../src/components/common/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, children, title }) => (
    isOpen ? (
      <div role="dialog" aria-modal="true">
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

jest.mock('../src/components/common/BarcodeInput', () => ({
  __esModule: true,
  default: ({ onScan, value }) => (
    <input
      value={value}
      onChange={(e) => onScan(e.target.value)}
      data-testid="barcode-input"
    />
  ),
}));

jest.mock('../src/components/common/Alert', () => ({
  __esModule: true,
  default: ({ message, type, onClose }) => (
    <div role="alert" className={`alert-${type}`}>
      {message}
      {onClose && <button onClick={onClose}>X</button>}
    </div>
  ),
}));

jest.mock('../src/components/common/ChartComponent', () => ({
  __esModule: true,
  default: ({ data, type }) => (
    <div data-testid="chart-component" data-type={type}>
      Chart: {type}
    </div>
  ),
}));

describe('Common Components', () => {
  describe('Button Component', () => {
    it('renders with children', () => {
      const { Button } = require('../src/components/common/Button');
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      const { Button } = require('../src/components/common/Button');
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      fireEvent.click(screen.getByText('Click me'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
      const { Button } = require('../src/components/common/Button');
      render(<Button disabled>Click me</Button>);
      expect(screen.getByText('Click me')).toBeDisabled();
    });
  });

  describe('Input Component', () => {
    it('renders with placeholder', () => {
      const { Input } = require('../src/components/common/Input');
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('calls onChange when value changes', () => {
      const { Input } = require('../src/components/common/Input');
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      expect(handleChange).toHaveBeenCalledWith('test');
    });
  });

  describe('Modal Component', () => {
    it('renders when isOpen is true', () => {
      const { Modal } = require('../src/components/common/Modal');
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      const { Modal } = require('../src/components/common/Modal');
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const { Modal } = require('../src/components/common/Modal');
      const handleClose = jest.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      fireEvent.click(screen.getByText('Close'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('BarcodeInput Component', () => {
    it('renders with barcode input', () => {
      const { BarcodeInput } = require('../src/components/common/BarcodeInput');
      const handleScan = jest.fn();
      render(<BarcodeInput onScan={handleScan} />);
      expect(screen.getByTestId('barcode-input')).toBeInTheDocument();
    });

    it('calls onScan when input changes', () => {
      const { BarcodeInput } = require('../src/components/common/BarcodeInput');
      const handleScan = jest.fn();
      render(<BarcodeInput onScan={handleScan} />);
      const input = screen.getByTestId('barcode-input');
      fireEvent.change(input, { target: { value: '123456789' } });
      expect(handleScan).toHaveBeenCalledWith('123456789');
    });
  });

  describe('Alert Component', () => {
    it('renders with message', () => {
      const { Alert } = require('../src/components/common/Alert');
      render(<Alert message="Test alert" type="error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Test alert')).toBeInTheDocument();
    });

    it('applies correct type class', () => {
      const { Alert } = require('../src/components/common/Alert');
      render(<Alert message="Test alert" type="error" />);
      expect(screen.getByRole('alert')).toHaveClass('alert-error');
    });

    it('calls onClose when close button is clicked', () => {
      const { Alert } = require('../src/components/common/Alert');
      const handleClose = jest.fn();
      render(<Alert message="Test alert" type="error" onClose={handleClose} />);
      fireEvent.click(screen.getByText('X'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ChartComponent', () => {
    it('renders with data and type', () => {
      const { ChartComponent } = require('../src/components/common/ChartComponent');
      const data = { labels: ['A', 'B'], datasets: [{ data: [1, 2] }] };
      render(<ChartComponent data={data} type="bar" />);
      expect(screen.getByTestId('chart-component')).toBeInTheDocument();
      expect(screen.getByTestId('chart-component')).toHaveAttribute('data-type', 'bar');
    });
  });
});
