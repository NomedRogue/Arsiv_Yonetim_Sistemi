import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { Badge } from './Badge';

describe('Badge Bileşeni', () => {
  it('metni doğru şekilde render etmeli', () => {
    render(<Badge text="Test Badge" color="green" />);
    expect(screen.getByText('Test Badge')).toBeTruthy();
  });

  it('"green" için doğru renk sınıfını uygulamalı', () => {
    render(<Badge text="Success" color="green" />);
    const badgeElement = screen.getByText('Success');
    expect(badgeElement.classList.contains('bg-status-green/20')).toBe(true);
    expect(badgeElement.classList.contains('text-status-green')).toBe(true);
  });

  it('"red" için doğru renk sınıfını uygulamalı', () => {
    render(<Badge text="Error" color="red" />);
    const badgeElement = screen.getByText('Error');
    expect(badgeElement.classList.contains('bg-status-red/20')).toBe(true);
    expect(badgeElement.classList.contains('text-status-red')).toBe(true);
  });

  it('farklı bir metin göstermeli', () => {
    render(<Badge text="Another Text" color="blue" />);
    expect(screen.getByText('Another Text')).toBeTruthy();
    expect(screen.queryByText('Test Badge')).toBeNull();
  });
});