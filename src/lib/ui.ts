import React from 'react';
import { Brain, BarChart, Globe, Cpu, Book, Briefcase, FileCode } from 'lucide-react';

export const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('ia') || n.includes('machine') || n.includes('intel')) return React.createElement(Brain, { size: 14 });
  if (n.includes('dad') || n.includes('anal') || n.includes('viz') || n.includes('grafic')) return React.createElement(BarChart, { size: 14 });
  if (n.includes('web') || n.includes('site') || n.includes('scrap')) return React.createElement(Globe, { size: 14 });
  if (n.includes('auto') || n.includes('script') || n.includes('bot')) return React.createElement(Cpu, { size: 14 });
  if (n.includes('estud') || n.includes('aul') || n.includes('curs') || n.includes('livr')) return React.createElement(Book, { size: 14 });
  if (n.includes('trab') || n.includes('proj')) return React.createElement(Briefcase, { size: 14 });
  return React.createElement(FileCode, { size: 14 });
};

export const getCategoryColor = (name: string) => {
  const colors = [
    '#5A5A40', // Olive
    '#1a1a1a', // Black
    '#8B4513', // SaddleBrown
    '#2F4F4F', // DarkSlateGray
    '#483D8B', // DarkSlateBlue
    '#556B2F', // DarkOliveGreen
    '#B22222', // Firebrick
    '#008B8B', // DarkCyan
  ];
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[colorIndex];
};
