import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import DateTimeRangePicker from './DateTimeRangePicker';
import { DateTimeRange, Constraints, Preset } from './types';
import { subDays } from 'date-fns';

const meta: Meta<typeof DateTimeRangePicker> = {
  title: 'DateTimeRangePicker',
  component: DateTimeRangePicker,
  parameters: {
    a11y: {
      config: {},
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultValue: DateTimeRange = {
  start: null,
  end: null,
  timezone: 'America/New_York',
};

const constraints: Constraints = {
  min: subDays(new Date(), 30),
  max: new Date(),
  blackouts: [new Date(2023, 10, 11)],
  minDuration: 1000 * 60 * 60,
  maxDuration: 1000 * 60 * 60 * 24 * 7,
};

const presets: Preset[] = [
  {
    label: 'Last 24 hours',
    getRange: (now) => ({
      start: subDays(now, 1),
      end: now,
    }),
  },
  {
    label: 'Last 7 days',
    getRange: (now) => ({
      start: subDays(now, 7),
      end: now,
    }),
  },
];

// Wrapper component to add state
const StatefulDateTimeRangePicker: React.FC<{
  initialValue: DateTimeRange;
  constraints?: Constraints;
  presets?: Preset[];
}> = ({ initialValue, constraints, presets }) => {
  const [value, setValue] = useState<DateTimeRange>(initialValue);
  return (
    <DateTimeRangePicker
      value={value}
      onChange={setValue}
      onApply={(val) => alert(`Applied: ${val.start} to ${val.end}`)}
      onCancel={() => alert('Cancelled')}
      constraints={constraints}
      presets={presets}
    />
  );
};

export const Default: Story = {
  render: () => (
    <StatefulDateTimeRangePicker
      initialValue={defaultValue}
      constraints={constraints}
      presets={presets}
    />
  ),
};

export const WithDSTTransition: Story = {
  render: () => (
    <StatefulDateTimeRangePicker
      initialValue={{
        start: new Date('2023-03-12T12:00:00Z'),
        end: new Date('2023-03-13T12:00:00Z'),
        timezone: 'America/New_York',
      }}
      constraints={constraints}
      presets={presets}
    />
  ),
};

export const InvalidRange: Story = {
  render: () => (
    <StatefulDateTimeRangePicker
      initialValue={{
        start: new Date(),
        end: subDays(new Date(), 10),
        timezone: 'America/New_York',
      }}
      constraints={constraints}
      presets={presets}
    />
  ),
};

export const KeyboardOnly: Story = {
  render: () => (
    <StatefulDateTimeRangePicker
      initialValue={defaultValue}
      constraints={constraints}
      presets={presets}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Test keyboard navigation: Tab to grid, use arrows to navigate, Enter to select.',
      },
    },
  },
};