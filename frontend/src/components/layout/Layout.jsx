import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { Card } from '../ui/Card'

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-4 lg:p-6">
          <Card className="min-h-[calc(100vh-4rem)]">
            <Outlet />
          </Card>
        </main>
      </div>
    </div>
  )
}

export default Layout
