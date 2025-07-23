
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { DateRange } from 'react-day-picker';

interface DateRangeSelectorProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  language: string;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  dateRange,
  onDateRangeChange,
  language
}) => {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Date Range Filter</CardTitle>
        <CardDescription>
          Select a date range to filter the backup data before downloading readable files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select Date Range (optional)</Label>
          <DateRangePicker
            value={dateRange}
            onValueChange={onDateRangeChange}
            placeholder="Select date range for filtering"
            locale={language}
          />
        </div>
        {dateRange?.from && (
          <p className="text-sm text-gray-600">
            Filtering data from {dateRange.from.toLocaleDateString()} 
            {dateRange.to && ` to ${dateRange.to.toLocaleDateString()}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DateRangeSelector;
