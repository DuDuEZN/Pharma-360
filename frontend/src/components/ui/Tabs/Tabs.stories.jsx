import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';

export default {
  title: 'Design System/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  subcomponents: { TabsList, TabsTrigger, TabsContent },
};

export const Default = {
  render: () => {
    const [activeTab, setActiveTab] = useState('products');
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <p className="p-4">Products content goes here.</p>
        </TabsContent>
        <TabsContent value="sales">
          <p className="p-4">Sales content goes here.</p>
        </TabsContent>
        <TabsContent value="customers">
          <p className="p-4">Customers content goes here.</p>
        </TabsContent>
      </Tabs>
    );
  },
};

export const WithIcons = {
  render: () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings">
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <p className="p-4">Dashboard content</p>
        </TabsContent>
        <TabsContent value="analytics">
          <p className="p-4">Analytics content</p>
        </TabsContent>
        <TabsContent value="settings">
          <p className="p-4">Settings content</p>
        </TabsContent>
      </Tabs>
    );
  },
};
