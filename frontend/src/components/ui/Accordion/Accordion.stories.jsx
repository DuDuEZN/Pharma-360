import React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './Accordion';

export default {
  title: 'Design System/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  argTypes: {
    multiple: {
      control: { type: 'boolean' },
    },
    defaultValue: {
      control: { type: 'array' },
    },
  },
};

export const Default = {
  render: () => (
    <Accordion>
      <AccordionItem value="item-1">
        <AccordionTrigger>What is Pharma 360?</AccordionTrigger>
        <AccordionContent>
          Pharma 360° is a comprehensive pharmacy management platform with modular Odoo-style architecture,
          local PostgreSQL database, and offline-first functionality.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>What features does it include?</AccordionTrigger>
        <AccordionContent>
          It includes stock management (FEFO/FIFO), sales, cash register, returns, invoicing, and AI modules
          with barcode scanner integration.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is it responsive?</AccordionTrigger>
        <AccordionContent>
          Yes! The platform is fully responsive and optimized for tablets (1024x768) used in pharmacies.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple = {
  render: () => (
    <Accordion multiple defaultValue={['item-1']}>
      <AccordionItem value="item-1">
        <AccordionTrigger>Section 1</AccordionTrigger>
        <AccordionContent>
          Content for section 1
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Section 2</AccordionTrigger>
        <AccordionContent>
          Content for section 2
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Section 3</AccordionTrigger>
        <AccordionContent>
          Content for section 3
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const WithCustomContent = {
  render: () => (
    <Accordion>
      <AccordionItem value="products">
        <AccordionTrigger className="text-lg font-semibold">
          Product Management
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <p>Manage your pharmacy products with:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Barcode scanning</li>
              <li>FEFO/FIFO stock management</li>
              <li>Batch tracking</li>
              <li>Expiration date monitoring</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="sales">
        <AccordionTrigger className="text-lg font-semibold">
          Sales Management
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <p>Process sales with:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Quick product search</li>
              <li>Barcode scanning</li>
              <li>Cart management</li>
              <li>Multiple payment methods</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
