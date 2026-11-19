import {TransitionId} from '../types/editor';

export type TransitionCategory = 'All' | 'Basic' | 'Camera' | 'MG / Slide' | 'Mask & Glitch';

export interface TransitionPreset {
  id: TransitionId;
  name: string;
  category: Exclude<TransitionCategory, 'All'>;
  defaultDuration: number;
  description: string;
}

export const TRANSITION_CATEGORIES: TransitionCategory[] = [
  'All',
  'Basic',
  'Camera',
  'MG / Slide',
  'Mask & Glitch',
];

export const TRANSITION_PRESETS: TransitionPreset[] = [
  {id: 'none', name: 'Cut (None)', category: 'Basic', defaultDuration: 0, description: 'Hard instant cut'},
  {id: 'cross-dissolve', name: 'Cross Dissolve', category: 'Basic', defaultDuration: 0.7, description: 'Silky opacity blend'},
  {id: 'mix-fade', name: 'Mix Smooth', category: 'Basic', defaultDuration: 0.8, description: 'Eased luminance mix'},
  {id: 'fade-black', name: 'Fade to Black', category: 'Basic', defaultDuration: 0.9, description: 'Dip smoothly through obsidian'},
  {id: 'flash-white', name: 'White Flash', category: 'Basic', defaultDuration: 0.5, description: 'High-energy camera flash'},
  {id: 'blur-dissolve', name: 'Blur Dissolve', category: 'Basic', defaultDuration: 0.75, description: 'Optical lens defocus blend'},
  {id: 'pull-in', name: 'Pull In Zoom', category: 'Camera', defaultDuration: 0.65, description: 'CapCut-style punch zoom in'},
  {id: 'pull-out', name: 'Pull Out Zoom', category: 'Camera', defaultDuration: 0.65, description: 'Smooth snap zoom out'},
  {id: 'whip-left', name: 'Whip Pan Left', category: 'Camera', defaultDuration: 0.55, description: 'Motion-blurred horizontal whip'},
  {id: 'whip-right', name: 'Whip Pan Right', category: 'Camera', defaultDuration: 0.55, description: 'Motion-blurred reverse whip'},
  {id: 'whip-up', name: 'Whip Pan Up', category: 'Camera', defaultDuration: 0.55, description: 'Vertical upward snap pan'},
  {id: 'whip-down', name: 'Whip Pan Down', category: 'Camera', defaultDuration: 0.55, description: 'Vertical downward snap pan'},
  {id: 'spin-cw', name: 'Spin CW', category: 'Camera', defaultDuration: 0.65, description: '360° clockwise velocity spin'},
  {id: 'spin-ccw', name: 'Spin CCW', category: 'Camera', defaultDuration: 0.65, description: 'Counter-clockwise whip spin'},
  {id: 'slide-left', name: 'Slide Push Left', category: 'MG / Slide', defaultDuration: 0.6, description: 'Clean push slide left'},
  {id: 'slide-right', name: 'Slide Push Right', category: 'MG / Slide', defaultDuration: 0.6, description: 'Clean push slide right'},
  {id: 'wipe-horizontal', name: 'Linear Wipe H', category: 'Mask & Glitch', defaultDuration: 0.7, description: 'Razor-sharp horizontal reveal'},
  {id: 'wipe-vertical', name: 'Linear Wipe V', category: 'Mask & Glitch', defaultDuration: 0.7, description: 'Clean vertical curtain reveal'},
  {id: 'iris-circle', name: 'Iris Circle', category: 'Mask & Glitch', defaultDuration: 0.8, description: 'Expanding circular aperture'},
  {id: 'split-open', name: 'Center Split', category: 'Mask & Glitch', defaultDuration: 0.75, description: 'Dual-door center open reveal'},
  {id: 'glitch-cut', name: 'RGB Glitch Cut', category: 'Mask & Glitch', defaultDuration: 0.45, description: 'Chromatic horizontal slice glitch'},
];
