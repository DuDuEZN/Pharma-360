import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../providers/ThemeProvider'
import { Menu, Bell, Search, User, ChevronDown, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Avatar, AvatarGroup } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/DropdownMenu'

function Header() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(3)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 lg:border-none">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <Input
            leftIcon={Search}
            placeholder="Rechercher un produit..."
            className="w-full"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hidden sm:flex"
            aria-label="Basculer le thème"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600 dark:text-white" />
            ) : (
              <Sun className="w-5 h-5 text-gray-600 dark:text-white" />
            )}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="danger"
                    size="xs"
                    className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {unreadNotifications} non lues
                </p>
              </div>
              <div className="p-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
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
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar
                  size="sm"
                  fallback={user?.username?.charAt(0).toUpperCase()}
                  className="border border-gray-200 dark:border-gray-700"
                />
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.username}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
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
                  className="text-danger-600 dark:text-danger-400 focus:text-danger-600 dark:focus:text-danger-400"
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
