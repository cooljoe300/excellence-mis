'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  label?: string;
  error?: string;
  required?: boolean;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  label,
  error,
  required,
  options,
  value,
  onChange,
  placeholder = 'Search and select...',
  disabled,
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter((opt) => value.includes(opt.value));
  const filteredOptions = options.filter(
    (opt) =>
      !value.includes(opt.value) &&
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleAddOption(optionValue: string) {
    onChange([...value, optionValue]);
    setSearchQuery('');
  }

  function handleRemoveOption(optionValue: string) {
    onChange(value.filter((v) => v !== optionValue));
  }

  function handleClearAll() {
    onChange([]);
  }

  return (
    <div className={cn('space-y-1', className)} ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          {value.length > 1 && (
            <span className="text-xs font-medium text-blue-600">
              Shared Class ({value.length} programmes)
            </span>
          )}
        </div>
      )}

      <div className="relative">
        {/* Selected items display */}
        <div
          className={cn(
            'min-h-[42px] w-full rounded-lg border border-border bg-white px-3 py-2',
            isOpen && 'border-primary ring-2 ring-primary/20',
            error && 'border-red-300',
            disabled && 'bg-slate-50 text-slate-600 cursor-not-allowed',
            'cursor-pointer'
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-sm text-slate-500">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                >
                  {option.label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveOption(option.value);
                    }}
                    className="ml-1 rounded-full hover:bg-blue-100"
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <ChevronDown
            className={cn(
              'absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white shadow-lg">
            {/* Search input */}
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search programmes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-border py-1.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-slate-500">
                  {searchQuery ? 'No programmes found' : 'All programmes selected'}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddOption(option.value);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>

            {/* Clear all button */}
            {selectedOptions.length > 0 && (
              <div className="border-t border-border p-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                  className="w-full rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                >
                  Clear all selections
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}