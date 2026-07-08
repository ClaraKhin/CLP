import { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  Heading,
  Badge,
  Separator,
  Icon,
} from "@chakra-ui/react";
import { Avatar } from "@/components/ui/avatar";
import { useStore } from "@/store/store";
import {
  LuLayoutDashboard,
  LuGrid3X3,
  LuSettings,
  LuUsers,
  LuShield,
  LuActivity,
  LuAppWindow,
  LuLogOut,
  LuMenu,
  LuX,
  LuChevronRight,
  LuKey,
  LuMail,
  LuBell,
  LuRocket,
} from "react-icons/lu";
import { Tooltip } from "@/components/ui/tooltip";

interface AppShellProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LuLayoutDashboard },
  { id: "my-apps", label: "My Applications", icon: LuGrid3X3 },
  { id: "app-launcher", label: "App Launcher", icon: LuRocket },
  { id: "account-settings", label: "Account Settings", icon: LuSettings },
];

const adminNavItems = [
  { id: "admin-dashboard", label: "Admin Dashboard", icon: LuLayoutDashboard },
  { id: "admin-users", label: "User Management", icon: LuUsers },
  { id: "admin-roles", label: "Role Management", icon: LuShield },
  { id: "admin-apps", label: "App Management", icon: LuAppWindow },
  { id: "admin-activity", label: "Login Activity", icon: LuActivity },
  { id: "admin-sso", label: "SSO Configuration", icon: LuKey },
  { id: "admin-email", label: "Email Notifications", icon: LuMail },
];

export default function AppShell({ children, currentPage, onNavigate }: AppShellProps) {
  const { auth, logout } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = auth.user;
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const SidebarContent = ({ compact = false }: { compact?: boolean }) => (
    <VStack gap="0" h="full" alignItems="stretch">
      {/* Logo */}
      <Box p={compact ? "3" : "6"} borderBottomWidth="1px" borderColor="border">
        <HStack gap="3" justifyContent={compact ? "center" : "start"}>
          <Box
            w="9"
            h="9"
            bg="blue.500"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink="0"
          >
            <LuShield size={18} color="white" />
          </Box>
          {!compact && (
            <VStack gap="0" alignItems="start">
              <Text fontWeight="bold" fontSize="sm" lineHeight="tight">SSO Portal</Text>
              <Text fontSize="xs" color="fg.muted" lineHeight="tight">Enterprise</Text>
            </VStack>
          )}
        </HStack>
      </Box>

      {/* Navigation */}
      <Box flex="1" overflowY="auto" py="4" px={compact ? "2" : "3"}>
        {/* Main nav */}
        <VStack gap="1" alignItems="stretch">
          {!compact && (
            <Text fontSize="xs" fontWeight="semibold" color="fg.subtle" px="3" mb="1" textTransform="uppercase" letterSpacing="wide">
              Menu
            </Text>
          )}
          {navItems.map((item) => {
            const active = currentPage === item.id;
            const ItemIcon = item.icon;
            const navBtn = (
              <Button
                key={item.id}
                variant={active ? "solid" : "ghost"}
                colorPalette={active ? "blue" : "gray"}
                size="sm"
                justifyContent={compact ? "center" : "start"}
                w="full"
                gap="3"
                px={compact ? "0" : "3"}
                py="2"
                onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                css={active ? {} : { color: "var(--chakra-colors-fg-muted)" }}
                _hover={active ? {} : { bg: "bg.muted", color: "fg" }}
              >
                <Icon as={ItemIcon} boxSize="4" />
                {!compact && <Text fontSize="sm" fontWeight={active ? "semibold" : "medium"}>{item.label}</Text>}
              </Button>
            );
            return compact ? (
              <Tooltip key={item.id} content={item.label} positioning={{ placement: "right" }}>
                {navBtn}
              </Tooltip>
            ) : navBtn;
          })}
        </VStack>

        {/* Admin nav */}
        {isAdmin && (
          <VStack gap="1" alignItems="stretch" mt="6">
            {!compact && <Separator mb="2" />}
            {!compact && (
              <Text fontSize="xs" fontWeight="semibold" color="fg.subtle" px="3" mb="1" textTransform="uppercase" letterSpacing="wide">
                Administration
              </Text>
            )}
            {compact && <Separator mb="2" />}
            {adminNavItems.map((item) => {
              const active = currentPage === item.id;
              const ItemIcon = item.icon;
              const navBtn = (
                <Button
                  key={item.id}
                  variant={active ? "solid" : "ghost"}
                  colorPalette={active ? "purple" : "gray"}
                  size="sm"
                  justifyContent={compact ? "center" : "start"}
                  w="full"
                  gap="3"
                  px={compact ? "0" : "3"}
                  py="2"
                  onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                  css={active ? {} : { color: "var(--chakra-colors-fg-muted)" }}
                  _hover={active ? {} : { bg: "bg.muted", color: "fg" }}
                >
                  <Icon as={ItemIcon} boxSize="4" />
                  {!compact && <Text fontSize="sm" fontWeight={active ? "semibold" : "medium"}>{item.label}</Text>}
                </Button>
              );
              return compact ? (
                <Tooltip key={item.id} content={item.label} positioning={{ placement: "right" }}>
                  {navBtn}
                </Tooltip>
              ) : navBtn;
            })}
          </VStack>
        )}
      </Box>

      {/* User section */}
      <Box p={compact ? "2" : "3"} borderTopWidth="1px" borderColor="border">
        {compact ? (
          <Tooltip content="Sign Out" positioning={{ placement: "right" }}>
            <Button variant="ghost" size="sm" w="full" px="0" justifyContent="center" onClick={logout}>
              <LuLogOut size={16} />
            </Button>
          </Tooltip>
        ) : (
          <HStack gap="3">
            <Avatar
              size="sm"
              name={user ? `${user.firstName} ${user.lastName}` : "U"}
              src={user?.avatar}
            />
            <VStack gap="0" alignItems="start" flex="1" minW="0">
              <Text fontSize="sm" fontWeight="semibold" truncate>{user?.firstName} {user?.lastName}</Text>
              <Badge size="xs" colorPalette={user?.role === "super_admin" ? "purple" : user?.role === "admin" ? "blue" : "gray"}>
                {user?.role?.replace("_", " ")}
              </Badge>
            </VStack>
            <Button variant="ghost" size="sm" px="1" onClick={logout} aria-label="Sign out">
              <LuLogOut size={16} />
            </Button>
          </HStack>
        )}
      </Box>
    </VStack>
  );

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Desktop sidebar - full */}
      <Box
        display={{ base: "none", xl: "block" }}
        w="240px"
        flexShrink="0"
        bg="bg.panel"
        borderRightWidth="1px"
        borderColor="border"
        overflowY="auto"
      >
        <SidebarContent />
      </Box>

      {/* Desktop sidebar - compact (tablet) */}
      <Box
        display={{ base: "none", md: "block", xl: "none" }}
        w="56px"
        flexShrink="0"
        bg="bg.panel"
        borderRightWidth="1px"
        borderColor="border"
        overflowY="auto"
      >
        <SidebarContent compact />
      </Box>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <Box
          display={{ base: "block", md: "none" }}
          position="fixed"
          inset="0"
          bg="blackAlpha.600"
          zIndex="overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <Box
        display={{ base: "block", md: "none" }}
        position="fixed"
        left={sidebarOpen ? "0" : "-280px"}
        top="0"
        bottom="0"
        w="260px"
        bg="bg.panel"
        borderRightWidth="1px"
        borderColor="border"
        zIndex="modal"
        transition="left 0.2s ease"
      >
        <SidebarContent />
      </Box>

      {/* Main content area */}
      <Flex flex="1" flexDir="column" overflow="hidden">
        {/* Topbar */}
        <HStack
          h="14"
          px="4"
          bg="bg.panel"
          borderBottomWidth="1px"
          borderColor="border"
          justifyContent="space-between"
          flexShrink="0"
        >
          <HStack gap="3">
            <Button
              display={{ base: "flex", md: "none" }}
              variant="ghost"
              size="sm"
              px="2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <LuX size={18} /> : <LuMenu size={18} />}
            </Button>
            <Text fontSize="sm" fontWeight="semibold" color="fg" display={{ base: "none", sm: "block" }}>
              {[...navItems, ...adminNavItems].find((n) => n.id === currentPage)?.label || "Dashboard"}
            </Text>
          </HStack>

          <HStack gap="2">
            <Avatar
              size="sm"
              name={user ? `${user.firstName} ${user.lastName}` : "U"}
              src={user?.avatar}
              cursor="pointer"
              onClick={() => onNavigate("account-settings")}
            />
          </HStack>
        </HStack>

        {/* Page content */}
        <Box flex="1" overflowY="auto" bg="bg.subtle">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
