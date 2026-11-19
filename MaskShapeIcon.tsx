import React from 'react';
import {MaskShapeId} from '../types/editor';

interface MaskShapeIconProps {
  shape: MaskShapeId;
  active?: boolean;
  inverted?: boolean;
}

/**
 * Crisp monochrome vector preview icon for every mask shape.
 * Clearly shows the masked frame region (and reflects invert state when selected).
 */
export const MaskShapeIcon: React.FC<MaskShapeIconProps> = ({
  shape,
  active = false,
  inverted = false,
}) => {
  const frameBg = active ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)';
  const frameStroke = active ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.22)';
  const solidFill = active ? '#000000' : '#FFFFFF';
  const dimFill = active ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.18)';
  const shapeFill = inverted ? 'none' : solidFill;
  const shapeStroke = solidFill;

  return (
    <svg
      viewBox="0 0 44 28"
      className="w-10 h-6 block shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer preview frame */}
      <rect
        x={1}
        y={1}
        width={42}
        height={26}
        rx={4}
        fill={inverted && shape !== 'none' ? dimFill : frameBg}
        stroke={frameStroke}
        strokeWidth={1.2}
      />

      {shape === 'none' && (
        <g stroke={solidFill} strokeWidth={1.6} strokeLinecap="round">
          <circle cx={22} cy={14} r={7} fill="none" opacity={0.75} />
          <line x1={17} y1={19} x2={27} y2={9} />
        </g>
      )}

      {shape === 'circle' && (
        <ellipse
          cx={22}
          cy={14}
          rx={9.5}
          ry={9.5}
          fill={shapeFill}
          stroke={shapeStroke}
          strokeWidth={1.6}
        />
      )}

      {shape === 'rectangle' && (
        <rect
          x={10}
          y={6}
          width={24}
          height={16}
          rx={2.5}
          fill={shapeFill}
          stroke={shapeStroke}
          strokeWidth={1.6}
        />
      )}

      {shape === 'split' && (
        <g>
          <rect
            x={2}
            y={2}
            width={40}
            height={12}
            rx={2.5}
            fill={inverted ? 'none' : solidFill}
            opacity={inverted ? 0 : 0.9}
          />
          <line
            x1={3}
            y1={14}
            x2={41}
            y2={14}
            stroke={solidFill}
            strokeWidth={1.6}
            strokeDasharray="2.5 2"
          />
        </g>
      )}

      {shape === 'filmstrip' && (
        <g>
          <rect
            x={2}
            y={8}
            width={40}
            height={12}
            fill={shapeFill}
            stroke={shapeStroke}
            strokeWidth={1.4}
          />
        </g>
      )}

      {shape === 'mirror' && (
        <g>
          <rect
            x={14}
            y={2}
            width={16}
            height={24}
            fill={shapeFill}
            stroke={shapeStroke}
            strokeWidth={1.4}
          />
          <line
            x1={22}
            y1={3}
            x2={22}
            y2={25}
            stroke={active && !inverted ? '#FFFFFF' : '#000000'}
            strokeWidth={1.2}
            strokeDasharray="2 2"
            opacity={0.75}
          />
        </g>
      )}

      {shape === 'diamond' && (
        <polygon
          points="22,4 33,14 22,24 11,14"
          fill={shapeFill}
          stroke={shapeStroke}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      )}

      {shape === 'heart' && (
        <path
          d="M22 22.8 C19.5 20.8 13.2 16.8 13.2 11.4 C13.2 8.2 15.6 6.2 18.2 6.2 C20 6.2 21.3 7.1 22 8.4 C22.7 7.1 24 6.2 25.8 6.2 C28.4 6.2 30.8 8.2 30.8 11.4 C30.8 16.8 24.5 20.8 22 22.8 Z"
          fill={shapeFill}
          stroke={shapeStroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      )}

      {shape === 'star' && (
        <polygon
          points="22,4.2 24.9,10.3 31.6,11.2 26.7,15.8 27.9,22.4 22,19.2 16.1,22.4 17.3,15.8 12.4,11.2 19.1,10.3"
          fill={shapeFill}
          stroke={shapeStroke}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      )}

      {shape === 'brush' && (
        <g stroke={solidFill} strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M11 19 C15 10, 22 18, 27 11 C29 8.5, 32 9, 33 11.5"
            fill="none"
            strokeWidth={3.2}
          />
          <circle cx={33} cy={11.5} r={2} fill={solidFill} stroke="none" />
        </g>
      )}
    </svg>
  );
};
