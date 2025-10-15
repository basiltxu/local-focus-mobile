import {
  Flame,
  Car,
  Siren,
  Wrench,
  Users,
  CloudSun,
  Construction,
  HelpCircle,
  LucideProps,
  ShieldAlert,
  UserCheck,
  UserX,
  Flag,
  Bomb,
  Activity,
  Mountain,
  Waves,
  CloudRain,
  Rocket,
  Skull,
  Building,
  AlertTriangle,
} from "lucide-react";

const iconMap: { [key: string]: React.ComponentType<LucideProps> } = {
  Clashes: ShieldAlert,
  Injured: UserCheck,
  Arrests: UserX,
  "Civil Unrest": Flag,
  "Armed incidents and attacks": Bomb,
  "Stones throwing": Activity,
  "Molotov Cocktails": Flame,
  "ISF operations": Building,
  Killing: Skull,
  "Rockets/ Sirens": Rocket,
  Hazzard: AlertTriangle,
  // Old categories for reference, might still be used by old data
  Fire: Flame,
  Traffic: Car,
  Crime: Siren,
  Utility: Wrench,
  "Community Event": Users,
  Weather: CloudSun,
  Construction: Construction,
  // Sub-categories
  'Traffic accidents': Car,
  'Earthquakes': Mountain,
  'Tsunami': Waves,
  'Flashfloods': CloudRain,
};

export const CategoryIcon = ({
  categoryName,
  ...props
}: { categoryName: string } & LucideProps) => {
  const Icon = iconMap[categoryName] || HelpCircle;
  return <Icon {...props} />;
};
