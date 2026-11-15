import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f7] via-[#e5e5ea] to-[#d1d1d6] text-secondary-900 dark:bg-black dark:text-white">
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="lg:pl-[264px]">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] animate-fade-in px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
