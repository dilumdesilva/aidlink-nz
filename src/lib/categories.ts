export type PinType = 'help' | 'need'

export interface CategoryDef {
  id: string
  type: PinType
  label: string
}

export const HELP_CATEGORIES: CategoryDef[] = [
  { id: 'shelter', type: 'help', label: 'Shelter / safe building open' },
  { id: 'fuel', type: 'help', label: 'Petrol / diesel available' },
  { id: 'food', type: 'help', label: 'Food / water / supplies' },
  { id: 'power', type: 'help', label: 'Phone charging / generator' },
  { id: 'wifi', type: 'help', label: 'Free wifi / connectivity' },
  { id: 'medical', type: 'help', label: 'Pharmacy / medical help' },
  { id: 'other_help', type: 'help', label: 'Other help available' },
]

export const NEED_CATEGORIES: CategoryDef[] = [
  { id: 'outage', type: 'need', label: 'Power outage' },
  { id: 'no_signal', type: 'need', label: 'No cell / internet signal' },
  { id: 'road', type: 'need', label: 'Road closed / flooded / unsafe' },
  { id: 'hazard', type: 'need', label: 'Downed line / slip / hazard' },
  { id: 'supplies', type: 'need', label: 'Supplies needed in this area' },
  { id: 'other_need', type: 'need', label: 'Other need / issue' },
]

export const ALL_CATEGORIES: CategoryDef[] = [...HELP_CATEGORIES, ...NEED_CATEGORIES]

const BY_ID = new Map<string, CategoryDef>(ALL_CATEGORIES.map(c => [c.id, c]))

export function getCategory(id: string): CategoryDef | undefined {
  return BY_ID.get(id)
}
