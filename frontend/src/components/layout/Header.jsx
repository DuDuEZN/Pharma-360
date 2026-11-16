import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../providers/ThemeProvider'
import { Menu, Bell, Search, ChevronDown, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/Avatar'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/DropdownMenu'

function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [unreadNotifications, setUnreadNotifications] = useState(3)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/70 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-transparent/60">
      <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-full text-secondary-600 transition-colors hover:bg-black/[0.05] dark:text-secondary-300 dark:hover:bg-white/10 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="hidden flex-1 md:flex md:max-w-sm">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
            <input
              type="search"
              placeholder="Rechercher un produit..."
              className="h-9 w-full rounded-full border border-black/[0.06] bg-black/[0.035] pl-10 pr-4 text-sm text-secondary-900 placeholder:text-secondary-400 transition-all duration-200 ease-apple focus:border-primary-500/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:focus:bg-white/10"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden h-9 w-9 items-center justify-center rounded-full text-secondary-600 transition-colors hover:bg-black/[0.05] dark:text-secondary-300 dark:hover:bg-white/10 sm:flex"
            aria-label="Basculer le thème"
          >
            {theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-secondary-600 transition-colors hover:bg-black/[0.05] dark:text-secondary-300 dark:hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unreadNotifications > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              <div className="border-b border-black/[0.06] p-4 dark:border-white/10">
                <h3 className="font-semibold tracking-tight text-secondary-900 dark:text-white">Notifications</h3>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  {unreadNotifications} non lues
                </p>
              </div>
              <div className="p-2">
                <p className="py-4 text-center text-sm text-secondary-500 dark:text-secondary-400">
                  Aucune notification
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setUnreadNotifications(0)}>
                Marquer toutes comme lues
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-black/[0.05] dark:hover:bg-white/10"
              >
                <Avatar
                  size="sm"
                  fallback={user?.username?.charAt(0)?.toUpperCase()}
                  className="border border-black/[0.06] dark:border-white/15"
                />
                <div className="hidden flex-col items-start sm:flex">
                  <span className="text-[13px] font-medium leading-tight text-secondary-900 dark:text-white">
                    {user?.username}
                  </span>
                  <span className="text-[11px] capitalize leading-tight text-secondary-500 dark:text-secondary-400">
                    {user?.role}
                  </span>
                </div>
                <ChevronDown className="hidden h-3.5 w-3.5 text-secondary-400 sm:inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="border-b border-black/[0.06] p-4 dark:border-white/10">
                <p className="text-sm font-medium text-secondary-900 dark:text-white">{user?.username}</p>
                <p className="text-xs capitalize text-secondary-500 dark:text-secondary-400">{user?.role}</p>
              </div>
              <div className="py-1">
                <DropdownMenuItem>
                  <Link to="/settings" className="w-full">
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className={cn('text-danger-600 focus:text-danger-600 dark:text-danger-400 dark:focus:text-danger-400')}
                >
                  Déconnexion
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default Header
