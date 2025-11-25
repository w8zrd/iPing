import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // Import jest-dom matchers
import { AuthProvider, useAuth } from './SupabaseAuthContext';
import { supabase } from '@/lib/supabase';

// Mock Supabase
// Mock Supabase
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { is_admin: false }, error: null })),
        })),
      })),
    })),
  },
}));

const TestComponent = () => {
  const { user, session, loading, isAdmin, signIn, signUp, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? 'Loading' : 'Loaded'}</span>
      <span data-testid="user">{user ? user.email : 'No User'}</span>
      <span data-testid="session">{session ? 'Session Active' : 'No Session'}</span>
      <span data-testid="isAdmin">{isAdmin ? 'Admin' : 'Not Admin'}</span>
      <button onClick={() => signIn('test@example.com', 'password123')}>Sign In</button>
      <button onClick={() => signUp('test@example.com', 'password123', 'testuser')}>Sign Up</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};

describe('AuthProvider', () => {
  it('provides initial loading state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
  });

  it('handles successful sign in', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockOnAuthStateChange.mockImplementationOnce((_event, callback) => {
        callback('SIGNED_IN', { user: { email: 'test@example.com', id: '123' }, access_token: 'abc', token_type: 'Bearer', expires_in: 3600, refresh_token: 'def' });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    screen.getByRole('button', { name: /Sign In/i }).click();

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('session')).toHaveTextContent('Session Active');
    });
  });

  it('handles sign out', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    mockOnAuthStateChange.mockImplementationOnce((_event, callback) => {
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // Mock initial signed-in state for signOut test BEFORE rendering
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { email: 'test@example.com', id: '123' }, access_token: 'abc', token_type: 'Bearer', expires_in: 3600, refresh_token: 'def' } } });

    render(
        <AuthProvider>
            <TestComponent />
        </AuthProvider>
    );

    await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    screen.getByRole('button', { name: /Sign Out/i }).click();

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
      expect(screen.getByTestId('session')).toHaveTextContent('No Session');
    });
  });

  it('handles successful sign up', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });
    mockOnAuthStateChange.mockImplementationOnce((_event, callback) => {
        callback('SIGNED_IN', { user: { email: 'test@example.com', id: '123' }, access_token: 'abc', token_type: 'Bearer', expires_in: 3600, refresh_token: 'def' });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
        <AuthProvider>
            <TestComponent />
        </AuthProvider>
    );

    await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    screen.getByRole('button', { name: /Sign Up/i }).click();

    await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
            options: {
                emailRedirectTo: `${window.location.origin}/`,
                data: {
                    username: 'testuser',
                    display_name: 'testuser',
                },
            },
        });
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('session')).toHaveTextContent('Session Active');
    });
  });

});