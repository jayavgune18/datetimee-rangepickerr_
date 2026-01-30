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
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden font-sans ring-1 ring-slate-900/5">
      {/* Header */}
      <div className="bg-slate-50 p-4 border-b border-slate-100">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selected Range</span>
          {error && <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">{error}</span>}
        </div>
        <div className="text-sm font-medium text-slate-900 truncate">
          {value.start ? formatInTimezone(value.start, tz, 'MMM d, p') : 'Pick a start'}
          <span className="mx-2 text-slate-400">→</span>
          {value.end ? formatInTimezone(value.end, tz, 'MMM d, p') : 'Pick an end'}
        </div>
      </div>

      <div className="p-6">
        {/* Timezone */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Timezone</label>
          <select
            value={tz}
            onChange={(e) => onChange({ ...value, timezone: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="America/New_York">America/New_York</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
          </select>
        </div>

        {/* Presets */}
        {presets.length > 0 && (
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(preset)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-full hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-bold text-slate-800">
              {formatInTimezone(currentMonth, tz, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div
            ref={gridRef}
            role="grid"
            onKeyDown={handleKeyDown}
            className="grid grid-cols-7 gap-1"
          >
            {weekDays.map((day, i) => (
              <div key={`${day}-${i}`} className="p-2 text-center text-[10px] font-bold text-slate-400 uppercase">
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
                  className={`relative p-2 text-sm text-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${disabled
                    ? 'text-slate-200 cursor-not-allowed'
                    : inRange
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                    } ${isStart || isEnd ? 'bg-indigo-600 !text-white z-10 scale-110 shadow-lg' : ''}`}
                >
                  {formatInTimezone(date, tz, 'd')}
                  {(isStart || isEnd) && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full opacity-50"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Pickers */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Start Time</label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <input
                type="number" min="0" max="23"
                value={startTime.hour}
                onChange={(e) => handleTimeChange('start', 'hour', parseInt(e.target.value) || 0)}
                className="w-full bg-transparent text-center text-sm font-medium focus:outline-none"
              />
              <span className="text-slate-300">:</span>
              <input
                type="number" min="0" max="59"
                value={startTime.minute}
                onChange={(e) => handleTimeChange('start', 'minute', parseInt(e.target.value) || 0)}
                className="w-full bg-transparent text-center text-sm font-medium focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">End Time</label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <input
                type="number" min="0" max="23"
                value={endTime.hour}
                onChange={(e) => handleTimeChange('end', 'hour', parseInt(e.target.value) || 0)}
                className="w-full bg-transparent text-center text-sm font-medium focus:outline-none"
              />
              <span className="text-slate-300">:</span>
              <input
                type="number" min="0" max="59"
                value={endTime.minute}
                onChange={(e) => handleTimeChange('end', 'minute', parseInt(e.target.value) || 0)}
                className="w-full bg-transparent text-center text-sm font-medium focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          onClick={() => onApply?.(value)}
          disabled={!!error || !value.start || !value.end}
          className="flex-[2] px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
        >
          Apply Range
        </button>
      </div>
    </div>
  );
};

export default DateTimeRangePicker;