
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface ReportFiltersProps {
  dateRange: { from: Date; to: Date };
  selectedCategory: string;
  reportFormat: 'pdf' | 'xlsx' | 'both';
  showFilters: boolean;
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  onCategoryChange: (category: string) => void;
  onFormatChange: (format: 'pdf' | 'xlsx' | 'both') => void;
  onToggleFilters: () => void;
}

const categories = [
  { value: 'all', label: 'All Data' },
  { value: 'sales', label: 'Sales Only' },
  { value: 'inventory', label: 'Inventory Only' },
  { value: 'customers', label: 'Customers Only' }
];

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  dateRange,
  selectedCategory,
  reportFormat,
  showFilters,
  onDateRangeChange,
  onCategoryChange,
  onFormatChange,
  onToggleFilters
}) => {
  const getFilterSummary = () => {
    const filters = [];
    if (selectedCategory !== 'all') {
      filters.push(`Category: ${categories.find(c => c.value === selectedCategory)?.label}`);
    }
    if (dateRange.from && dateRange.to) {
      filters.push(`Date: ${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`);
    }
    return filters;
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={onToggleFilters}
      >
        <Filter className="mr-2 h-4 w-4" />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </Button>

      {}
      {getFilterSummary().length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Active Filters:</Label>
          <div className="flex gap-2 flex-wrap">
            {getFilterSummary().map((filter, index) => (
              <Badge key={index} variant="secondary">{filter}</Badge>
            ))}
          </div>
        </div>
      )}

      {}
      {showFilters && (
        <Card className="border-dashed">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'From date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => date && onDateRangeChange({ ...dateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'To date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => date && onDateRangeChange({ ...dateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {}
              <div className="space-y-2">
                <Label>Data Category</Label>
                <Select value={selectedCategory} onValueChange={onCategoryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {}
            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select value={reportFormat} onValueChange={(value: 'pdf' | 'xlsx' | 'both') => onFormatChange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Only</SelectItem>
                  <SelectItem value="xlsx">Excel Only</SelectItem>
                  <SelectItem value="both">Both PDF & Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
