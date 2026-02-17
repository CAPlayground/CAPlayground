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
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { AnyLayer } from '@/lib/ca/types';
import { SupportedFilterTypes, Filter } from '@/lib/filters';
import { supportedFilters } from '@/lib/filters';
import { RotationKnob } from '@/components/ui/rotation-knob';

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

  const updateValue = (val: number) => {
    updateLayer(
      selected.id,
      { filters: currentFilters.map(f => f.name === filter.name ? { ...f, value: val } : f) }
    )
  }

  const getKnobProps = (type: SupportedFilterTypes) => {
    switch (type) {
      case 'colorHueRotate':
        return { unit: '°', step: 1, snapToOrthogonal: true };
      case 'gaussianBlur':
        return { unit: '', step: 1, snapToOrthogonal: false };
      case 'colorContrast':
      case 'colorSaturate':
        return { unit: '', step: 0.1, snapToOrthogonal: false };
      case 'colorInvert':
      case 'CISepiaTone':
        return { unit: '', step: 0.01, snapToOrthogonal: false };
      default:
        return { unit: '', step: 1, snapToOrthogonal: false };
    }
  }

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

        const knobProps = getKnobProps((filter as any).type as SupportedFilterTypes);

        return (
          <div className="space-y-1 flex justify-start py-2">
            <RotationKnob
              label={def.valueLabel}
              value={filter.value}
              onChange={updateValue}
              onChangeEnd={updateValue}
              {...knobProps}
            />
          </div>
        );
      })()}
    </div>
  );
}
