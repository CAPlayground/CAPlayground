import { useEditor } from '../../editor-context';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InspectorTabProps } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { AnyLayer } from '@/lib/ca/types';
import { SupportedFilterTypes, Filter } from '@/lib/filters';
import { supportedFilters } from '@/lib/filters';

export function FiltersTab({
  selected
}: InspectorTabProps) {
  const { updateLayer } = useEditor();
  const currentFilters = selected.filters ?? [];

  const addFilter = (filter: SupportedFilterTypes) => {
    const selectedFilter = supportedFilters[filter]
    if (!selectedFilter) return;
    const count = currentFilters.filter(f => f.type === filter).length;
    const newFilter = {
      ...selectedFilter,
      name: `${selectedFilter.name} ${count + 1}`,
    }
    updateLayer(selected.id, { filters: [...currentFilters, newFilter] });
  };

  return (
    <div className="grid grid-cols-1 gap-y-2">
      <Select
        value={''}
        onValueChange={addFilter}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Add filter" />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(supportedFilters).map((filter) => (
            <SelectItem key={filter} value={filter}>
              {supportedFilters[filter as SupportedFilterTypes].name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentFilters.map((filter, i) => (
        <FilterItem key={filter.name} filter={filter} selected={selected} />
      ))}
    </div>
  );
}

const FilterItem = ({ filter, selected }: { filter: Filter; selected: AnyLayer }) => {
  const { updateLayer } = useEditor();
  const currentFilters = selected.filters ?? [];
  const onEnableFilter = (checked: boolean) => {
    updateLayer(
      selected.id,
      { filters: currentFilters.map(f => f.name === filter.name ? { ...f, enabled: checked } : f) }
    )
  };
  const onRemoveFilter = () => {
    updateLayer(
      selected.id,
      { filters: currentFilters.filter(f => f.name !== filter.name) }
    );
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateLayer(
      selected.id,
      { filters: currentFilters.map(f => f.name === filter.name ? { ...f, value: Number(e.target.value) } : f) }
    )
  };
  return (
    <div className="space-y-2">
      <Separator className="my-4" />
      <div className="flex items-center gap-2">
        <Checkbox
          checked={filter.enabled}
          onCheckedChange={onEnableFilter}
          title="Enable filter"
        />
        <Label htmlFor="blur" className="text-xs">
          {filter.name}
        </Label>
        <Button
          className="h-6 w-6 ml-auto"
          size="icon"
          variant="destructive"
          onClick={onRemoveFilter}
          aria-label="Remove filter"
          title="Remove filter"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
      {(() => {
        const def = supportedFilters[(filter as any).type as SupportedFilterTypes];
        if (!def || !def.valueLabel) return null;
        return (
          <div className="space-y-1">
            <Label>{def.valueLabel}</Label>
            <Input type="number" value={filter.value} onChange={onChange} />
          </div>
        );
      })()}
    </div>
  );
}
