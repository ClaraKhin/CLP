import { useMemo } from "react";
import {
  Box,
  Button,
  Text,
  Heading,
  VStack,
  HStack,
  SimpleGrid,
  Badge,
} from "@chakra-ui/react";
import { useStore } from "@/store/store";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  LuUsers,
  LuMonitor,
  LuAppWindow,
  LuShield,
  LuTrendingUp,
  LuCircleAlert,
  LuCircleCheck,
} from "react-icons/lu";
import { formatDistanceToNow, subDays, format } from "date-fns";

interface AdminDashboardPageProps {
  onNavigate: (page: string) => void;
}

export default function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const { users, applications, loginActivity, roles } = useStore();

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const totalApps = applications.length;
  const activeApps = applications.filter((a) => a.status === "active").length;
  const totalLogins = loginActivity.filter((a) => a.status === "success").length;
  const failedLogins = loginActivity.filter((a) => a.status === "failed" || a.status === "blocked").length;

  // Login activity per day (last 7 days)
  const loginByDay = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const dayStr = format(day, "MMM d");
      const dayIso = format(day, "yyyy-MM-dd");
      const dayActivity = loginActivity.filter((a) => a.timestamp.startsWith(dayIso));
      return {
        day: dayStr,
        success: dayActivity.filter((a) => a.status === "success").length,
        failed: dayActivity.filter((a) => a.status !== "success").length,
      };
    });
  }, [loginActivity]);

  // Users by role
  const usersByRole = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return Object.entries(counts).map(([role, count]) => ({ name: role.replace("_", " "), value: count }));
  }, [users]);

  // Apps by category
  const appsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((a) => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return Object.entries(counts).map(([cat, count]) => ({ name: cat, value: count }));
  }, [applications]);

  const PIE_COLORS = ["#2563eb", "#9333ea", "#14b8a6", "#f59e0b", "#ef4444", "#10b981"];

  const stats = [
    { label: "Total Users", value: totalUsers, sub: `${activeUsers} active`, icon: LuUsers, color: "blue", page: "admin-users" },
    { label: "Applications", value: totalApps, sub: `${activeApps} active`, icon: LuAppWindow, color: "purple", page: "admin-apps" },
    { label: "Successful Logins", value: totalLogins, sub: "All time", icon: LuCircleCheck, color: "green", page: "admin-activity" },
    { label: "Failed/Blocked", value: failedLogins, sub: "Requires attention", icon: LuCircleAlert, color: "red", page: "admin-activity" },
  ];

  const recentActivity = loginActivity.slice(0, 8);

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1400px" mx="auto">
      <HStack justifyContent="space-between" mb="8" flexWrap="wrap" gap="4">
        <VStack alignItems="start" gap="1">
          <Heading size="xl" fontWeight="bold">Admin Dashboard</Heading>
          <Text color="fg.muted">System overview and analytics</Text>
        </VStack>
      </HStack>

      {/* KPI Stats */}
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
              cursor="pointer"
              _hover={{ shadow: "md", transform: "translateY(-1px)", borderColor: `${stat.color}.300` }}
              transition="all 0.15s"
              onClick={() => onNavigate(stat.page)}
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
                <LuTrendingUp size={14} color="var(--chakra-colors-fg-muted)" />
              </HStack>
              <Text fontSize="3xl" fontWeight="bold">{stat.value}</Text>
              <Text fontSize="sm" fontWeight="medium" mt="0.5">{stat.label}</Text>
              <Text fontSize="xs" color="fg.muted" mt="0.5">{stat.sub}</Text>
            </Box>
          );
        })}
      </SimpleGrid>

      {/* Charts Row */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap="6" mb="6">
        {/* Login Activity Chart */}
        <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="5">
          <Heading size="sm" mb="5">Login Activity (Last 7 Days)</Heading>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={loginByDay} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chakra-colors-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--chakra-colors-fg-muted)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--chakra-colors-fg-muted)" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--chakra-colors-bg-panel)",
                  border: "1px solid var(--chakra-colors-border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="success" name="Successful" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Users by Role */}
        <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="5">
          <Heading size="sm" mb="5">Users by Role</Heading>
          <HStack gap="4" alignItems="center" justifyContent="center" flexWrap="wrap">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={usersByRole}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                >
                  {usersByRole.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--chakra-colors-bg-panel)",
                    border: "1px solid var(--chakra-colors-border)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <VStack gap="2" alignItems="start">
              {usersByRole.map((item, i) => (
                <HStack key={item.name} gap="2">
                  <Box w="3" h="3" borderRadius="sm" bg={PIE_COLORS[i % PIE_COLORS.length]} />
                  <Text fontSize="sm" textTransform="capitalize">{item.name}</Text>
                  <Badge size="sm" colorPalette="gray">{item.value}</Badge>
                </HStack>
              ))}
            </VStack>
          </HStack>
        </Box>
      </SimpleGrid>

      {/* Recent Activity Table */}
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" overflow="hidden">
        <HStack p="5" borderBottomWidth="1px" borderColor="border" justifyContent="space-between">
          <Heading size="sm">Recent Login Activity</Heading>
          <Button variant="ghost" size="xs" onClick={() => onNavigate("admin-activity")}>
            View all →
          </Button>
        </HStack>
        <Box overflowX="auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["User", "Status", "Application", "IP / Location", "Device", "Time"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--chakra-colors-fg-muted)",
                    borderBottom: "1px solid var(--chakra-colors-border)",
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((activity, i) => (
                <tr
                  key={activity.id}
                  style={{
                    borderBottom: i < recentActivity.length - 1 ? "1px solid var(--chakra-colors-border)" : "none",
                  }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <VStack gap="0" alignItems="start">
                      <Text fontSize="sm" fontWeight="medium">{activity.userName}</Text>
                      <Text fontSize="xs" color="var(--chakra-colors-fg-muted)">{activity.userEmail}</Text>
                    </VStack>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Box
                      display="inline-flex"
                      alignItems="center"
                      gap="4px"
                      px="8px"
                      py="2px"
                      borderRadius="9999px"
                      fontSize="12px"
                      fontWeight="500"
                      bg={activity.status === "success" ? "var(--chakra-colors-green-100)" : "var(--chakra-colors-red-100)"}
                      color={activity.status === "success" ? "var(--chakra-colors-green-700)" : "var(--chakra-colors-red-700)"}
                    >
                      {activity.status}
                    </Box>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                    {activity.applicationName || "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <VStack gap="0" alignItems="start">
                      <Text fontSize="sm">{activity.ip}</Text>
                      <Text fontSize="xs" color="var(--chakra-colors-fg-muted)">{activity.location}</Text>
                    </VStack>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--chakra-colors-fg-muted)" }}>
                    {activity.browser}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--chakra-colors-fg-muted)", whiteSpace: "nowrap" }}>
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}
