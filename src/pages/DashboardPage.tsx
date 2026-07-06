import { useMemo } from "react";
import {
  Box,
  Button,
  Text,
  Heading,
  VStack,
  HStack,
  Flex,
  SimpleGrid,
  Badge,
  Separator,
} from "@chakra-ui/react";
import { useStore } from "@/store/store";
import {
  LuUsers,
  LuMonitor,
  LuClock,
  LuShield,
  LuTrendingUp,
  LuActivity,
  LuGrid3X3,
  LuCircleCheckBig,
  LuCircleAlert,
  LuExternalLink,
} from "react-icons/lu";
import { formatDistanceToNow } from "date-fns";

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { auth, loginActivity, applications, users } = useStore();
  const { launchApp } = useStore();
  const user = auth.user!;

  const userApps = useMemo(
    () => applications.filter((a) => a.allowedRoles.includes(user.role) && a.status !== "inactive").slice(0, 6),
    [applications, user.role]
  );

  const recentActivity = useMemo(
    () => loginActivity.filter((a) => a.userId === user.id).slice(0, 5),
    [loginActivity, user.id]
  );

  const userSessions = useMemo(
    () => users.find((u) => u.id === user.id)?.sessionCount || 1,
    [users, user.id]
  );

  const totalLogins = useMemo(
    () => loginActivity.filter((a) => a.userId === user.id && a.status === "success").length,
    [loginActivity, user.id]
  );

  const securityStatus = user.twoFactorEnabled ? "Secure" : "Needs Attention";
  const securityColor = user.twoFactorEnabled ? "green" : "orange";

  const stats = [
    { label: "Total Logins", value: totalLogins, icon: LuTrendingUp, color: "blue" },
    { label: "Active Sessions", value: userSessions, icon: LuMonitor, color: "teal" },
    { label: "Assigned Apps", value: userApps.length, icon: LuGrid3X3, color: "purple" },
    { label: "Security Status", value: securityStatus, icon: LuShield, color: securityColor },
  ];

  const handleLaunch = (appId: string, url: string) => {
    launchApp(appId);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1400px" mx="auto">
      {/* Welcome */}
      <HStack justifyContent="space-between" mb="8" flexWrap="wrap" gap="4">
        <VStack alignItems="start" gap="1">
          <Heading size="xl" fontWeight="bold">
            Welcome back, {user.firstName}! 👋
          </Heading>
          <Text color="fg.muted">
            {user.lastLogin
              ? `Last login: ${formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}`
              : "First login!"}
          </Text>
        </VStack>
        <HStack gap="2">
          <Button
            colorPalette="blue"
            onClick={() => onNavigate("my-apps")}
            size="sm"
          >
            <LuGrid3X3 size={14} />
            My Applications
          </Button>
        </HStack>
      </HStack>

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap="4" mb="8">
        {stats.map((stat) => {
          const StatIcon = stat.icon;
          return (
            <Box
              key={stat.label}
              bg="bg.panel"
              borderRadius="xl"
              p="5"
              borderWidth="1px"
              borderColor="border"
              _hover={{ shadow: "md", transform: "translateY(-1px)" }}
              transition="all 0.2s"
            >
              <HStack justifyContent="space-between" mb="3">
                <Box
                  w="10"
                  h="10"
                  bg={`${stat.color}.50`}
                  _dark={{ bg: `${stat.color}.950` }}
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <StatIcon size={20} color={`var(--chakra-colors-${stat.color}-500)`} />
                </Box>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold">{stat.value}</Text>
              <Text fontSize="sm" color="fg.muted" mt="0.5">{stat.label}</Text>
            </Box>
          );
        })}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap="6">
        {/* My Applications */}
        <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" overflow="hidden">
          <HStack p="5" borderBottomWidth="1px" borderColor="border" justifyContent="space-between">
            <Heading size="sm">My Applications</Heading>
            <Button variant="ghost" size="xs" onClick={() => onNavigate("my-apps")}>
              View all <LuGrid3X3 size={12} />
            </Button>
          </HStack>
          <Box p="4">
            {userApps.length === 0 ? (
              <VStack py="8" gap="2" color="fg.muted">
                <LuGrid3X3 size={32} />
                <Text fontSize="sm">No applications assigned</Text>
              </VStack>
            ) : (
              <SimpleGrid columns={2} gap="3">
                {userApps.map((app) => (
                  <Box
                    key={app.id}
                    p="3"
                    bg="bg.subtle"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border"
                    cursor="pointer"
                    _hover={{ borderColor: "blue.300", bg: "blue.50", _dark: { bg: "blue.950" } }}
                    transition="all 0.15s"
                    onClick={() => handleLaunch(app.id, app.url)}
                    position="relative"
                  >
                    <HStack gap="3">
                      <Box fontSize="2xl">{app.icon}</Box>
                      <VStack gap="0" alignItems="start" flex="1" minW="0">
                        <Text fontSize="sm" fontWeight="semibold" truncate>{app.name}</Text>
                        <Badge
                          size="xs"
                          colorPalette={app.status === "active" ? "green" : app.status === "maintenance" ? "orange" : "red"}
                        >
                          {app.status}
                        </Badge>
                      </VStack>
                      <LuExternalLink size={14} color="var(--chakra-colors-fg-muted)" />
                    </HStack>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </Box>
        </Box>

        {/* Recent Activity */}
        <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" overflow="hidden">
          <HStack p="5" borderBottomWidth="1px" borderColor="border" justifyContent="space-between">
            <Heading size="sm">Recent Activity</Heading>
            <Badge colorPalette="gray" size="sm">{recentActivity.length} events</Badge>
          </HStack>
          <Box>
            {recentActivity.length === 0 ? (
              <VStack py="8" gap="2" color="fg.muted">
                <LuActivity size={32} />
                <Text fontSize="sm">No recent activity</Text>
              </VStack>
            ) : (
              recentActivity.map((activity, i) => (
                <HStack
                  key={activity.id}
                  px="5"
                  py="4"
                  borderBottomWidth={i < recentActivity.length - 1 ? "1px" : "0"}
                  borderColor="border"
                  gap="3"
                >
                  <Box
                    w="8"
                    h="8"
                    borderRadius="full"
                    bg={activity.status === "success" ? "green.50" : "red.50"}
                    _dark={{ bg: activity.status === "success" ? "green.950" : "red.950" }}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink="0"
                  >
                    {activity.status === "success" ? (
                      <LuCircleCheckBig size={16} color="var(--chakra-colors-green-500)" />
                    ) : (
                      <LuCircleAlert size={16} color="var(--chakra-colors-red-500)" />
                    )}
                  </Box>
                  <VStack gap="0" alignItems="start" flex="1" minW="0">
                    <Text fontSize="sm" fontWeight="medium">
                      {activity.status === "success" ? "Signed in" : "Failed login attempt"}
                      {activity.applicationName ? ` — ${activity.applicationName}` : ""}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {activity.browser} · {activity.location}
                    </Text>
                  </VStack>
                  <Text fontSize="xs" color="fg.subtle" whiteSpace="nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </Text>
                </HStack>
              ))
            )}
          </Box>
        </Box>
      </SimpleGrid>

      {/* Security Banner */}
      {!user.twoFactorEnabled && (
        <Box
          mt="6"
          p="4"
          bg="orange.50"
          _dark={{ bg: "orange.950" }}
          borderRadius="xl"
          borderWidth="1px"
          borderColor="orange.200"
          _dark2={{ borderColor: "orange.800" }}
        >
          <HStack justifyContent="space-between" flexWrap="wrap" gap="3">
            <HStack gap="3">
              <LuCircleAlert size={20} color="var(--chakra-colors-orange-500)" />
              <VStack alignItems="start" gap="0">
                <Text fontWeight="semibold" fontSize="sm">Two-Factor Authentication Disabled</Text>
                <Text fontSize="xs" color="fg.muted">Secure your account by enabling 2FA in account settings</Text>
              </VStack>
            </HStack>
            <Button colorPalette="orange" size="sm" onClick={() => onNavigate("account-settings")}>
              Enable 2FA
            </Button>
          </HStack>
        </Box>
      )}
    </Box>
  );
}
