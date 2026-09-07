/**
 * Programme Colour System for Excellence Online College
 * Based on existing college theme colours
 */

export interface ProgrammeColour {
  name: string;
  border: string;
  background: string;
  text: string;
  badge: string;
}

// Excellence Online College Theme-Based Colour Palette
const THEME_COLOURS: ProgrammeColour[] = [
  {
    name: 'Primary Blue',
    border: '#003380',
    background: '#eef2f9',
    text: '#003380',
    badge: '#003380',
  },
  {
    name: 'Accent Gold',
    border: '#e1a916',
    background: '#fef9ec',
    text: '#e1a916',
    badge: '#e1a916',
  },
  {
    name: 'Deep Navy',
    border: '#1e3a5f',
    background: '#f0f4f8',
    text: '#1e3a5f',
    badge: '#1e3a5f',
  },
  {
    name: 'Slate Blue',
    border: '#475569',
    background: '#f8fafc',
    text: '#475569',
    badge: '#475569',
  },
  {
    name: 'Teal',
    border: '#0f766e',
    background: '#f0fdfa',
    text: '#0f766e',
    badge: '#0f766e',
  },
  {
    name: 'Indigo',
    border: '#4338ca',
    background: '#eef2ff',
    text: '#4338ca',
    badge: '#4338ca',
  },
  {
    name: 'Purple',
    border: '#7c3aed',
    background: '#faf5ff',
    text: '#7c3aed',
    badge: '#7c3aed',
  },
  {
    name: 'Rose',
    border: '#e11d48',
    background: '#fff1f2',
    text: '#e11d48',
    badge: '#e11d48',
  },
];

/**
 * Get a consistent colour for a programme based on its ID
 * This ensures the same programme always gets the same colour
 */
export function getProgrammeColour(programmeId: string | null | undefined): ProgrammeColour {
  if (!programmeId) {
    return THEME_COLOURS[0]; // Default to primary blue
  }

  // Use a simple hash function to deterministically select a colour
  const hash = programmeId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  const colourIndex = hash % THEME_COLOURS.length;
  return THEME_COLOURS[colourIndex];
}

/**
 * Get colour classes for Tailwind CSS
 */
export function getProgrammeColourClasses(programmeId: string | null | undefined): {
  border: string;
  background: string;
  text: string;
  badge: string;
} {
  const colour = getProgrammeColour(programmeId);
  return {
    border: colour.border,
    background: colour.background,
    text: colour.text,
    badge: colour.badge,
  };
}

/**
 * Get inline styles for programme colour
 */
export function getProgrammeColourStyles(programmeId: string | null | undefined): {
  borderLeftColor: string;
  backgroundColor: string;
  color: string;
} {
  const colour = getProgrammeColour(programmeId);
  return {
    borderLeftColor: colour.border,
    backgroundColor: colour.background,
    color: colour.text,
  };
}

/**
 * Special colour for shared/common classes
 */
export const SHARED_CLASS_COLOUR: ProgrammeColour = {
  name: 'Shared Class',
  border: '#e1a916', // Accent gold
  background: '#fef9ec', // Accent light
  text: '#e1a916',
  badge: '#e1a916',
};

/**
 * Get shared class colour classes
 */
export function getSharedClassColourClasses(): {
  border: string;
  background: string;
  text: string;
  badge: string;
} {
  return {
    border: SHARED_CLASS_COLOUR.border,
    background: SHARED_CLASS_COLOUR.background,
    text: SHARED_CLASS_COLOUR.text,
    badge: SHARED_CLASS_COLOUR.badge,
  };
}