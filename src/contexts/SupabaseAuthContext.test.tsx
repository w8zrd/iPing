import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './SupabaseAuthContext';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
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
    (supabase.auth.signInWithPassword as vi.Mock).mockResolvedValueOnce({ error: null });
    (supabase.auth.onAuthStateChange as vi.Mock).mockImplementationOnce((callback) => {
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
    (supabase.auth.signOut as vi.Mock).mockResolvedValueOnce({ error: null });
    (supabase.auth.onAuthStateChange as vi.Mock).mockImplementationOnce((callback) => {
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate a user already being signed in
    (supabase.auth.onAuthStateChange as vi.Mock).mock.calls('SIGNED_IN', { user: { email: 'test@example.com', id: '123' }, access_token: 'abc', token_type: 'Bearer', expires_in: 3600, refresh_token: 'def' });

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
    (supabase.auth.signUp as vi.Mock).mockResolvedValueOnce({ error: null });
    (supabase.auth.onAuthStateChange as vi.Mock).mockImplementationOnce((callback) => {
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
                emailRedirectTo: 'http://localhost:3000/', // Assuming default test environment URL
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