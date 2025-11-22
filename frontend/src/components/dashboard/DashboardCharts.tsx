import React from 'react';
import { Category } from '@/types';
import { useTheme } from '@/hooks/useTheme';

// Helper function to wrap text for the Treemap labels
const wrapTextForTreemap = (text: string, width: number, fontSize: number): string[] => {
  const words = text.split(' ');
  if (text.length * fontSize * 0.55 > width - 10 && words.length > 1) {
    const midPoint = Math.ceil(words.length / 2);
    const line1 = words.slice(0, midPoint).join(' ');
    const line2 = words.slice(midPoint).join(' ');
    return [line1, line2];
  }
  return [text];
};

export const CustomizedTreemapContent = (props: any) => {
  const { depth, x, y, width, height, index, name, percentage, category } = props;
  const [theme] = useTheme();

  if (width < 20 || height < 20) {
    return null;
  }

  if (depth === 1) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: 'transparent',
            stroke: name === 'Tıbbi' ? '#28A745' : '#007BFF',
            strokeWidth: 3,
            pointerEvents: 'none',
          }}
        />
        <text x={x + 8} y={y + 20} fill={theme === 'dark' ? '#f1f5f9' : '#1e293b'} fontSize="1rem" fontWeight="bold">
          {name}
        </text>
      </g>
    );
  }

  if (depth === 2) {
    const COLORS =
      theme === 'dark'
        ? ['#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']
        : ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];

    const GREEN_COLORS =
      theme === 'dark'
        ? ['#064e3b', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
        : ['#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46'];

    const colorPalette = category === Category.Tibbi ? GREEN_COLORS : COLORS;
    const color = colorPalette[index % colorPalette.length];

    const fontSize = Math.max(Math.min(width / 7, height / 4, 14), 9);
    const showText = width > 50 && height > 40;

    const nameLines = showText ? wrapTextForTreemap(name, width, fontSize) : [];
    const percentageLine = `${(percentage || 0).toFixed(2)}%`;
    const allLines = [...nameLines, percentageLine];
    const lineCount = allLines.length;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: color,
            stroke: theme === 'dark' ? '#334155' : '#fff',
            strokeWidth: 2,
          }}
        />
        {showText && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={fontSize}
            style={{ pointerEvents: 'none', textShadow: '0 0 5px rgba(0,0,0,0.7)' }}
          >
            {nameLines.map((line, i) => (
              <tspan key={i} x={x + width / 2} dy={i === 0 ? `${-(lineCount - 1) * 0.6}em` : '1.2em'}>
                {line}
              </tspan>
            ))}
            <tspan x={x + width / 2} dy="1.2em" fontSize={fontSize * 0.9} fontWeight="bold">
              {percentageLine}
            </tspan>
          </text>
        )}
      </g>
    );
  }

  return null;
};

export const CustomTreemapTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (!data) return null;
    const nameStr = String(data.name).split(' - ')[0];
    return (
      <div className="p-3 bg-white dark:bg-archive-dark-panel rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 text-sm transition-colors duration-300">
        <p className="font-bold text-gray-800 dark:text-gray-200 transition-colors duration-300">{nameStr}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">
          {`${data.folderCount || 0} Klasör (${(data.percentage || 0).toFixed(2)}%)`}
        </p>
      </div>
    );
  }
  return null;
};

export const CustomPieTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const name = data.name;
    const value = data.value;
    return (
      <div className="p-3 bg-white dark:bg-archive-dark-panel rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 text-sm transition-colors duration-300">
        <p className="font-bold" style={{ color: data.payload.fill }}>
          {name}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">{`${value} Klasör`}</p>
      </div>
    );
  }
  return null;
};

export const CustomAreaChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-white dark:bg-archive-dark-panel rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 transition-colors duration-300">
        <p className="label font-bold text-sm text-gray-800 dark:text-gray-200 transition-colors duration-300">{label}</p>
        <ul className="list-none p-0 m-0 mt-2 space-y-1">
          {payload.map((pld: any, index: number) => (
            <li key={index} className="text-xs flex items-center" style={{ color: pld.stroke }}>
              <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: pld.stroke }} />
              {`${pld.name}: ${pld.value}`}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
};