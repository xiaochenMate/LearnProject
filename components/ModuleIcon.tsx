import React from 'react';
import {
  AppWindow,
  Atom,
  BookOpen,
  BookOpenText,
  Brain,
  Calculator,
  CircleDollarSign,
  Clock3,
  Drama,
  Feather,
  Gamepad2,
  Globe2,
  Grid3X3,
  Languages,
  LibraryBig,
  Paintbrush,
  Puzzle,
  ScrollText,
  Sprout,
  Waves,
} from 'lucide-react';

const ICONS: Record<string, React.ElementType> = {
  public: Globe2,
  menu_book: BookOpen,
  auto_stories: LibraryBig,
  pest_control: Sprout,
  waves: Waves,
  spellcheck: Languages,
  history_edu: Feather,
  hourglass_empty: Clock3,
  schedule: Clock3,
  calculate: Calculator,
  grid_view: Grid3X3,
  casino: Drama,
  blur_on: Gamepad2,
  lightbulb: Brain,
  api: CircleDollarSign,
  palette: Paintbrush,
  translate: Languages,
  currency_exchange: CircleDollarSign,
  import_contacts: BookOpenText,
  widgets: AppWindow,
  apps: AppWindow,
};

interface ModuleIconProps {
  name?: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const ModuleIcon: React.FC<ModuleIconProps> = ({ name, className, size = 24, strokeWidth = 1.8 }) => {
  const Icon = (name && ICONS[name]) || Puzzle;
  return <Icon aria-hidden="true" className={className} size={size} strokeWidth={strokeWidth} />;
};

export default ModuleIcon;
