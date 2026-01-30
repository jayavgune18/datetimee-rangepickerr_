import React, { useState, useRef, useEffect } from 'react';
import { addMonths, subMonths, isSameDay, addDays, isBefore } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { DateTimeRange, Constraints, Preset } from './types';
import { getCalendarDays, formatInTimezone, isDateDisabled, validateRange } from './utils';

interface DateTimeRangePickerProps {
  value: DateTimeRange;
  onChange: (value: DateTimeRange) => void;
  onApply?: (value: DateTimeRange) => void;
  onCancel?: () => void;
  constraints?: Constraints | undefined;
  presets?: Preset[] | undefined;
}

const DateTimeRangePicker: React.FC<DateTimeRangePickerProps> = ({
  value,
  onChange,
  onApply,
  onCancel,
  constraints,
  presets = [],
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState({ hour: 0, minute: 0 });
  const [endTime, setEndTime] = useState({ hour: 23, minute: 59 });
  const [error, setError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const tz = value.timezone;
  const calendarDays = getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth(), tz);

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const firstDay = calendarDays[0];
  const firstDayOfWeek = new Intl.DateTimeFormat('en', { timeZone: tz, weekday: 'narrow' }).format(firstDay);
  const startIndex = weekDays.indexOf(firstDayOfWeek);

  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date, constraints, tz)) return;
    let newStart = value.start;
    let newEnd = value.end;

    if (!value.start || (value.start && value.end)) {
      newStart = date;
      newEnd = null;
    } else {
      newEnd = date;
      if (isBefore(newEnd, newStart)) {
        [newStart, newEnd] = [newEnd, newStart];
      }
    }

    const validationError = validateRange(newStart, newEnd, constraints);
    setError(validationError);
    onChange({ ...value, start: newStart, end: newEnd });
  };

  const handleTimeChange = (type: 'start' | 'end', field: 'hour' | 'minute', val: number) => {
    const updatedTime = type === 'start'
      ? { ...startTime, [field]: val }
      : { ...endTime, [field]: val };

    if (type === 'start') setStartTime(updatedTime);
    else setEndTime(updatedTime);

    const newValue = { ...value };
    if (type === 'start' && newValue.start) {
      const zoned = utcToZonedTime(newValue.start, tz);
      zoned.setHours(updatedTime.hour, updatedTime.minute);
      newValue.start = zonedTimeToUtc(zoned, tz);
    } else if (type === 'end' && newValue.end) {
      const zoned = utcToZonedTime(newValue.end, tz);
      zoned.setHours(updatedTime.hour, updatedTime.minute);
      newValue.end = zonedTimeToUtc(zoned, tz);
    }

    const validationError = validateRange(newValue.start, newValue.end, constraints);
    setError(validationError);
    onChange(newValue);
  };

  const handlePresetSelect = (preset: Preset) => {
    const now = new Date();
    const range = preset.getRange(now, tz);
    onChange({ ...value, ...range });
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focusedDate) return;
    let newFocused = focusedDate;
    switch (e.key) {
      case 'ArrowLeft': newFocused = addDays(focusedDate, -1); break;
      case 'ArrowRight': newFocused = addDays(focusedDate, 1); break;
      case 'ArrowUp': newFocused = addDays(focusedDate, -7); break;
      case 'ArrowDown': newFocused = addDays(focusedDate, 7); break;
      case 'Enter': handleDateSelect(focusedDate); return;
      default: return;
    }
    e.preventDefault();
    setFocusedDate(newFocused);
  };

  useEffect(() => {
    if (focusedDate && gridRef.current) {
      const cell = gridRef.current.querySelector(`[data-date="${focusedDate.toISOString()}"]`) as HTMLElement;
      cell?.focus();
    }
  }, [focusedDate]);

  const isInRange = (date: Date) => {
    if (!value.start || !value.end) return false;
    return date >= value.start && date <= value.end;
  };

  const isRangeStart = (date: Date) => value.start && isSameDay(date, value.start);
  const isRangeEnd = (date: Date) => value.end && isSameDay(date, value.end);

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-300 rounded shadow-sm text-gray-800 font-sans">
      {/* Simple Selection Display */}
      <div className="p-4 border-b border-gray-200">
        <label className="block text-xs font-medium text-gray-500 mb-1">SELECTED RANGE</label>
        <div className="text-sm font-semibold truncate">
          {value.start ? formatInTimezone(value.start, tz, 'MMM d, p') : 'Start'}
          <span className="mx-2 text-gray-400">-</span>
          {value.end ? formatInTimezone(value.end, tz, 'MMM d, p') : 'End'}
        </div>
      </div>

      <div className="p-5">
        <div className="flex gap-4 mb-4">
          {/* Timezone Select */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Timezone</label>
            <select
              value={tz}
              onChange={(e) => onChange({ ...value, timezone: e.target.value })}
              className="w-full text-sm p-1.5 border border-gray-300 rounded bg-white outline-none focus:border-blue-500"
            >
              <option value="America/New_York">New York</option>
              <option value="Europe/London">London</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </div>

        {/* Presets - Simple chips */}
        {presets.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(preset)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 bg-white transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded">
              <span className="text-lg">‹</span>
            </button>
            <span className="text-sm font-bold">
              {formatInTimezone(currentMonth, tz, 'MMMM yyyy')}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded">
              <span className="text-lg">›</span>
            </button>
          </div>
          <div ref={gridRef} role="grid" onKeyDown={handleKeyDown} className="grid grid-cols-7 text-[11px]">
            {weekDays.map((day, i) => (
              <div key={`${day}-${i}`} className="p-2 text-center text-gray-400 font-medium">
                {day}
              </div>
            ))}
            {Array.from({ length: startIndex }, (_, i) => (
              <div key={`empty-${i}`} className="p-2"></div>
            ))}
            {calendarDays.map((date) => {
              const disabled = isDateDisabled(date, constraints, tz);
              const inRange = isInRange(date);
              const isStart = isRangeStart(date);
              const isEnd = isRangeEnd(date);
              return (
                <button
                  key={date.toISOString()}
                  data-date={date.toISOString()}
                  disabled={disabled}
                  onClick={() => handleDateSelect(date)}
                  onFocus={() => setFocusedDate(date)}
                  className={`p-2 text-center rounded transition-colors focus:outline-none ${disabled
                      ? 'text-gray-300'
                      : inRange
                        ? 'bg-blue-50 text-blue-800'
                        : 'hover:bg-gray-50 text-gray-700'
                    } ${isStart || isEnd ? 'bg-blue-600 !text-white font-bold' : ''}`}
                >
                  {formatInTimezone(date, tz, 'd')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Settings */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
            <div className="flex border border-gray-300 rounded p-1 text-xs">
              <input
                type="number" min="0" max="23" value={startTime.hour}
                onChange={(e) => handleTimeChange('start', 'hour', parseInt(e.target.value) || 0)}
                className="w-full text-center outline-none"
              />
              <span className="px-0.5">:</span>
              <input
                type="number" min="0" max="59" value={startTime.minute}
                onChange={(e) => handleTimeChange('start', 'minute', parseInt(e.target.value) || 0)}
                className="w-full text-center outline-none"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
            <div className="flex border border-gray-300 rounded p-1 text-xs">
              <input
                type="number" min="0" max="23" value={endTime.hour}
                onChange={(e) => handleTimeChange('end', 'hour', parseInt(e.target.value) || 0)}
                className="w-full text-center outline-none"
              />
              <span className="px-0.5">:</span>
              <input
                type="number" min="0" max="59" value={endTime.minute}
                onChange={(e) => handleTimeChange('end', 'minute', parseInt(e.target.value) || 0)}
                className="w-full text-center outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="px-5 pb-3 text-[11px] text-red-600">{error}</div>}

      {/* Simplified Footer Actions */}
      <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onApply?.(value)}
          disabled={!!error || !value.start || !value.end}
          className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded shadow-sm transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default DateTimeRangePicker;