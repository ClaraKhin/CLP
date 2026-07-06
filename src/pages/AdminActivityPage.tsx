import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Input,
  Text,
  Heading,
  VStack,
  HStack,
  Badge,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  SelectRoot, SelectTrigger, SelectValueText, SelectContent, SelectItem,
} from "@/components/ui/select";
import { createListCollection } from "@chakra-ui/react";
import { useStore } from "@/store/store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import {
  LuSearch, LuChevronUp, LuChevronDown, LuCircleCheck, LuCircleX, LuCircleAlert,
} from "react-icons/lu";
import { formatDistanceToNow, format, subDays } from "date-fns";

type SortKey = "userName" | "timestamp" | "status" | "applicationName" | "ip";

const PAGE_SIZE = 10;

export default function AdminActivityPage() {
  const { loginActivity } = useStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(["all"]);
  const [appFilter, setAppFilter] = useState<string[]>(["all"]);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "timestamp", dir: "desc" });
  const [page, setPage] = useState(1);

  const statusOptions = createListCollection({
    items: [
      { label: "All Statuses", value: "all" },
      { label: "Success", value: "success" },
      { label: "Failed", value: "failed" },
      { label: "Blocked", value: "blocked" },
    ],
  });

  const uniqueApps = useMemo(() => {
    const apps = [...new Set(loginActivity.map((a) => a.applicationName).filter(Boolean))];
    return createListCollection({
      items: [
        { label: "All Applications", value: "all" },
        ...apps.map((a) => ({ label: a!, value: a! })),
      ],
    });
  }, [loginActivity]);

  const filtered = useMemo(() => {
    let list = [...loginActivity];
    const sf = statusFilter[0];
    const af = appFilter[0];
    if (sf && sf !== "all") list = list.filter((a) => a.status === sf);
    if (af && af !== "all") list = list.filter((a) => a.applicationName === af);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.userName.toLowerCase().includes(q) ||
          a.userEmail.toLowerCase().includes(q) ||
          a.ip.includes(q)
      );
    }
    list.sort((a, b) => {
      let av: string, bv: string;
      if (sort.key === "userName") { av = a.userName; bv = b.userName; }
      else if (sort.key === "status") { av = a.status; bv = b.status; }
      else if (sort.key === "applicationName") { av = a.applicationName || ""; bv = b.applicationName || ""; }
      else if (sort.key === "ip") { av = a.ip; bv = b.ip; }
      else { av = a.timestamp; bv = b.timestamp; }
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [loginActivity, search, statusFilter, appFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
    setPage(1);
  };

  // Charts data
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const dayStr = format(day, "MMM d");
      const dayIso = format(day, "yyyy-MM-dd");
      const dayList = loginActivity.filter((a) => a.timestamp.startsWith(dayIso));
      return {
        day: dayStr,
        success: dayList.filter((a) => a.status === "success").length,
        failed: dayList.filter((a) => a.status === "failed").length,
        blocked: dayList.filter((a) => a.status === "blocked").length,
      };
    });
  }, [loginActivity]);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key === k ? (sort.dir === "asc" ? <LuChevronUp size={12} /> : <LuChevronDown size={12} />) : null;

  const statusIcon = (s: string) =>
    s === "success" ? <LuCircleCheck size={14} color="var(--chakra-colors-green-500)" /> :
    s === "blocked" ? <LuCircleAlert size={14} color="var(--chakra-colors-orange-500)" /> :
    <LuCircleX size={14} color="var(--chakra-colors-red-500)" />;

  const statusColor = (s: string) =>
    s === "success" ? "green" : s === "blocked" ? "orange" : "red";

  const successCount = loginActivity.filter((a) => a.status === "success").length;
  const failedCount = loginActivity.filter((a) => a.status === "failed").length;
  const blockedCount = loginActivity.filter((a) => a.status === "blocked").length;

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1400px" mx="auto">
      <VStack alignItems="start" gap="1" mb="6">
        <Heading size="xl" fontWeight="bold">Login Activity</Heading>
        <Text color="fg.muted">{loginActivity.length} total events</Text>
      </VStack>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, sm: 3 }} gap="4" mb="6">
        {[
          { label: "Successful Logins", value: successCount, color: "green" },
          { label: "Failed Attempts", value: failedCount, color: "red" },
          { label: "Blocked Attempts", value: blockedCount, color: "orange" },
        ].map((s) => (
          <Box key={s.label} bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="4">
            <Text fontSize="2xl" fontWeight="bold">{s.value}</Text>
            <Text fontSize="sm" color="fg.muted" mt="0.5">{s.label}</Text>
            <Box mt="2" h="1.5" borderRadius="full" bg="bg.muted">
              <Box
                h="full"
                borderRadius="full"
                bg={`${s.color}.500`}
                w={`${Math.round((s.value / loginActivity.length) * 100)}%`}
              />
            </Box>
          </Box>
        ))}
      </SimpleGrid>

      {/* Chart */}
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="5" mb="6">
        <Heading size="sm" mb="4">Login Activity (Last 7 Days)</Heading>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chakra-colors-border)" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--chakra-colors-fg-muted)" }} />
            <YAxis tick={{ fontSize: 12, fill: "var(--chakra-colors-fg-muted)" }} />
            <Tooltip contentStyle={{ background: "var(--chakra-colors-bg-panel)", border: "1px solid var(--chakra-colors-border)", borderRadius: "8px" }} />
            <Legend />
            <Bar dataKey="success" name="Success" fill="#2563eb" radius={[3, 3, 0, 0]} />
            <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Bar dataKey="blocked" name="Blocked" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Filters */}
      <HStack gap="3" mb="4" flexWrap="wrap">
        <Box position="relative" flex="1" minW="200px">
          <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" pointerEvents="none" color="fg.muted">
            <LuSearch size={16} />
          </Box>
          <Input placeholder="Search by user, email, IP..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} pl="9" size="sm" />
        </Box>
        <SelectRoot collection={statusOptions} value={statusFilter} onValueChange={(d) => { setStatusFilter(d.value); setPage(1); }} size="sm" w="150px">
          <SelectTrigger><SelectValueText placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {statusOptions.items.map((i) => <SelectItem key={i.value} item={i}>{i.label}</SelectItem>)}
          </SelectContent>
        </SelectRoot>
        <SelectRoot collection={uniqueApps} value={appFilter} onValueChange={(d) => { setAppFilter(d.value); setPage(1); }} size="sm" w="180px">
          <SelectTrigger><SelectValueText placeholder="Application" /></SelectTrigger>
          <SelectContent>
            {uniqueApps.items.map((i) => <SelectItem key={i.value} item={i}>{i.label}</SelectItem>)}
          </SelectContent>
        </SelectRoot>
      </HStack>

      {/* Table */}
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" overflow="hidden">
        <Box overflowX="auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--chakra-colors-bg-subtle)" }}>
                {([
                  ["userName", "User"],
                  ["status", "Status"],
                  ["applicationName", "Application"],
                  ["ip", "IP / Location"],
                  [null, "Device"],
                  ["timestamp", "Time"],
                ] as [SortKey | null, string][]).map(([k, label]) => (
                  <th key={label} style={{ padding: "10px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--chakra-colors-fg-muted)", cursor: k ? "pointer" : "default", whiteSpace: "nowrap" }} onClick={k ? () => toggleSort(k) : undefined}>
                    <HStack gap="1" display="inline-flex">{label}{k && <SortIcon k={k} />}</HStack>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--chakra-colors-fg-muted)" }}>No activity found</td></tr>
              ) : paginated.map((a, i) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--chakra-colors-border)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <VStack gap="0" alignItems="start">
                      <Text fontSize="sm" fontWeight="medium">{a.userName}</Text>
                      <Text fontSize="xs" color="var(--chakra-colors-fg-muted)">{a.userEmail}</Text>
                    </VStack>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <HStack gap="1.5">
                      {statusIcon(a.status)}
                      <Badge colorPalette={statusColor(a.status)} size="sm">{a.status}</Badge>
                    </HStack>
                    {a.failureReason && <Text fontSize="xs" color="var(--chakra-colors-fg-muted)" mt="0.5">{a.failureReason}</Text>}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "14px" }}>{a.applicationName || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <VStack gap="0" alignItems="start">
                      <Text fontSize="sm">{a.ip}</Text>
                      <Text fontSize="xs" color="var(--chakra-colors-fg-muted)">{a.location}</Text>
                    </VStack>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--chakra-colors-fg-muted)" }}>
                    {a.device} · {a.browser}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--chakra-colors-fg-muted)", whiteSpace: "nowrap" }}>
                    {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
        <HStack p="4" borderTopWidth="1px" borderColor="border" justifyContent="space-between" flexWrap="wrap" gap="2">
          <Text fontSize="sm" color="fg.muted">
            {filtered.length === 0 ? "0 results" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </Text>
          <HStack gap="2">
            <Button size="xs" variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Prev</Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              if (p > totalPages) return null;
              return <Button key={p} size="xs" variant={page === p ? "solid" : "outline"} colorPalette={page === p ? "blue" : "gray"} onClick={() => setPage(p)}>{p}</Button>;
            })}
            <Button size="xs" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>Next</Button>
          </HStack>
        </HStack>
      </Box>
    </Box>
  );
}
