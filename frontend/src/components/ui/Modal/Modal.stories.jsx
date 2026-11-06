import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from '../Button/Button';

export default {
  title: 'Design System/Modal',
  component: Modal,
  tags: ['autodocs'],
  subcomponents: { ModalHeader, ModalBody, ModalFooter },
};

export const Default = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <ModalHeader>
            <h2 className="text-xl font-semibold">Modal Title</h2>
          </ModalHeader>
          <ModalBody>
            <p>This is the modal content. You can put any content here.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsOpen(false)}>Save</Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  },
};

export const WithLongContent = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold">Long Content Modal</h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
              <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
              <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
            <Button onClick={() => setIsOpen(false)}>Save</Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  },
};

export const SmallModal = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>Open Small Modal</Button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="sm">
          <ModalHeader>
            <h2 className="text-lg font-semibold">Small Modal</h2>
          </ModalHeader>
          <ModalBody>
            <p>This is a small modal.</p>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  },
};

export const WithoutFooter = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <ModalHeader>
            <h2 className="text-xl font-semibold">Modal without Footer</h2>
          </ModalHeader>
          <ModalBody>
            <p>This modal has no footer.</p>
          </ModalBody>
        </Modal>
      </div>
    );
  },
};
