import { describe, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './providers/SupabaseAuthContext';

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
  });
});