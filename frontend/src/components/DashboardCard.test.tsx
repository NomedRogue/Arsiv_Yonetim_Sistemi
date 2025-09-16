import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { DashboardCard } from './DashboardCard';
import { Folder } from 'lucide-react'; // Test için bir ikon import edelim

describe('DashboardCard Bileşeni', () => {
  it('başlığı ve değeri doğru şekilde render etmeli', () => {
    render(<DashboardCard title="Toplam Klasör" value={150} icon={Folder} color="#007BFF" />);
    
    expect(screen.getByText('Toplam Klasör')).toBeTruthy();
    expect(screen.getByText('150')).toBeTruthy();
  });

  it('ikonu render etmeli', () => {
    const { container } = render(<DashboardCard title="Test" value={10} icon={Folder} color="#FFC107" />);
    
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeTruthy();
  });

  it('ikona doğru metin rengini uygulamalı', () => {
    const color = '#28A745'; // Yeşil
    const { container } = render(<DashboardCard title="Tıbbi" value={50} icon={Folder} color={color} />);
    
    const iconContainer = container.querySelector('div > div:first-child');
    expect(iconContainer).toBeTruthy();
    
    const svgElement = iconContainer!.querySelector('svg');
    (expect(svgElement) as any).toHaveStyle(`color: ${color}`);
  });
});