import { Icon } from "@chakra-ui/react";
import * as LucideIcons from "react-icons/lu";

const iconMap: Record<string, React.ComponentType<{ size?: number }> | React.ComponentType> = {
  MessageCircle: LucideIcons.LuMessageCircle,
  Github: LucideIcons.LuGithub,
  ClipboardList: LucideIcons.LuClipboardList,
  BarChart3: LucideIcons.LuChartBar,
  Palette: LucideIcons.LuPalette,
  Cloud: LucideIcons.LuCloud,
  Video: LucideIcons.LuVideo,
  Hexagon: LucideIcons.LuHexagon,
};

interface IconRendererProps {
  iconName: string;
  size?: number;
}

export default function IconRenderer({ iconName, size = 24 }: IconRendererProps) {
  const IconComponent = iconMap[iconName] || LucideIcons.LuGrid3X3;
  
  return <Icon as={IconComponent} boxSize={size} />;
}
