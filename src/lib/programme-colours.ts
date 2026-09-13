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

// Dedicated colour for CPA-I programme
const CPA_I_COLOUR: ProgrammeColour = {
  name: 'CPA-I Dedicated',
  border: '#dc2626', // Professional red for CPA-I
  background: '#fef2f2',
  text: '#dc2626',
  badge: '#dc2626',
};

// Dedicated colour for CIFA programme
const CIFA_COLOUR: ProgrammeColour = {
  name: 'CIFA Dedicated',
  border: '#e1a916', // Accent gold for CIFA
  background: '#fef9ec',
  text: '#e1a916',
  badge: '#e1a916',
};

// Dedicated colour for CPA-F programme (matches CIFA)
const CPA_F_COLOUR: ProgrammeColour = {
  name: 'CPA-F Dedicated',
  border: '#e1a916', // Same accent gold as CIFA
  background: '#fef9ec',
  text: '#e1a916',
  badge: '#e1a916',
};

/**
 * Get a consistent colour for a programme based on its ID
 * This ensures the same programme always gets the same colour
 * CPA-I gets a dedicated red colour for distinction
 * CIFA and CPA-F use the same accent gold colour
 */
export function getProgrammeColour(programmeId: string | null | undefined, programmeName?: string | null): ProgrammeColour {
  if (!programmeId) {
    return THEME_COLOURS[0]; // Default to primary blue
  }

  // Check if this is CPA-I programme (case-insensitive check)
  if (programmeName && programmeName.toLowerCase().includes('cpa-i')) {
    return CPA_I_COLOUR;
  }

  // Check if this is CIFA programme (case-insensitive check)
  if (programmeName && programmeName.toLowerCase().includes('cifa')) {
    return CIFA_COLOUR;
  }

  // Check if this is CPA-F programme (case-insensitive check)
  if (programmeName && programmeName.toLowerCase().includes('cpa-f')) {
    return CPA_F_COLOUR;
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
export function getProgrammeColourClasses(programmeId: string | null | undefined, programmeName?: string | null): {
  border: string;
  background: string;
  text: string;
  badge: string;
} {
  const colour = getProgrammeColour(programmeId, programmeName);
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
export function getProgrammeColourStyles(programmeId: string | null | undefined, programmeName?: string | null): {
  borderLeftColor: string;
  backgroundColor: string;
  color: string;
} {
  const colour = getProgrammeColour(programmeId, programmeName);
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