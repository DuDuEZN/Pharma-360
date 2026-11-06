import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './Table';
import { Badge } from '../Badge/Badge';

export default {
  title: 'Design System/Table',
  component: Table,
  tags: ['autodocs'],
  subcomponents: { TableHeader, TableBody, TableHead, TableRow, TableCell },
};

export const Default = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>1</TableCell>
          <TableCell>Product 1</TableCell>
          <TableCell><Badge variant="success">In Stock</Badge></TableCell>
          <TableCell>10.00 XOF</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>2</TableCell>
          <TableCell>Product 2</TableCell>
          <TableCell><Badge variant="warning">Low Stock</Badge></TableCell>
          <TableCell>15.00 XOF</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>3</TableCell>
          <TableCell>Product 3</TableCell>
          <TableCell><Badge variant="danger">Out of Stock</Badge></TableCell>
          <TableCell>20.00 XOF</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const WithStripedRows = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="bg-gray-50 dark:bg-gray-800">
          <TableCell>1</TableCell>
          <TableCell>Paracetamol</TableCell>
          <TableCell>Medicine</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>2</TableCell>
          <TableCell>Amoxicillin</TableCell>
          <TableCell>Antibiotic</TableCell>
        </TableRow>
        <TableRow className="bg-gray-50 dark:bg-gray-800">
          <TableCell>3</TableCell>
          <TableCell>Vitamin C</TableCell>
          <TableCell>Supplement</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const EmptyTable = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="text-center py-8 text-gray-500">
            No data available
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
