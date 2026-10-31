import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../src/pages/LoginPage.jsx'

const loginMock = vi.fn()
const addToastMock = vi.fn()

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}))

vi.mock('../src/components/common/Toast', () => ({
  useToast: () => ({
    addToast: addToastMock,
  }),
}))

describe('Login page', () => {
  it('renders the login form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Pharmacie 360')).toBeInTheDocument()
    expect(screen.getByLabelText(/nom d'utilisateur/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
  })

  it('submits the form and calls the login function', async () => {
    loginMock.mockResolvedValue({ success: true, user: { username: 'admin' } })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/nom d'utilisateur/i), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin', 'secret')
    })
  })
})
