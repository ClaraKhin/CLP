import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Input,
  Text,
  Heading,
  VStack,
  HStack,
  SimpleGrid,
  Badge,
  Flex,
  Icon,
} from "@chakra-ui/react";
import { useStore } from "@/store/store";
import {
  LuSearch,
  LuGrid3X3,
  LuList,
  LuStar,
  LuExternalLink,
  LuFilter,
  LuArrowUpDown,
} from "react-icons/lu";
import { formatDistanceToNow } from "date-fns";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createListCollection } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";

export default function MyApplicationsPage() {
  const { auth, applications, toggleFavorite, launchApp } = useStore();
  const user = auth.user!;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string[]>(["all"]);
  const [sort, setSort] = useState<string[]>(["name-asc"]);
  const [view, setView] = useState<"grid" | "list">("grid");

  const filterCollection = createListCollection({
    items: [
      { label: "All Apps", value: "all" },
      { label: "Favorites", value: "favorites" },
      { label: "Active", value: "active" },
      { label: "Maintenance", value: "maintenance" },
    ],
  });

  const sortCollection = createListCollection({
    items: [
      { label: "Name (A-Z)", value: "name-asc" },
      { label: "Name (Z-A)", value: "name-desc" },
      { label: "Recently Used", value: "recent" },
      { label: "Category", value: "category" },
    ],
  });

  const accessibleApps = useMemo(
    () => applications.filter((a) => a.allowedRoles.includes(user.role)),
    [applications, user.role]
  );

  const filteredApps = useMemo(() => {
    let apps = [...accessibleApps];

    // Apply filter
    const activeFilter = filter[0] || "all";
    if (activeFilter === "favorites") {
      apps = apps.filter((a) => user.favoriteApps.includes(a.id));
    } else if (activeFilter === "active") {
      apps = apps.filter((a) => a.status === "active");
    } else if (activeFilter === "maintenance") {
      apps = apps.filter((a) => a.status === "maintenance");
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    // Apply sort
    const activeSort = sort[0] || "name-asc";
    if (activeSort === "name-asc") apps.sort((a, b) => a.name.localeCompare(b.name));
    else if (activeSort === "name-desc") apps.sort((a, b) => b.name.localeCompare(a.name));
    else if (activeSort === "recent") {
      apps.sort((a, b) => {
        if (!a.lastAccessed) return 1;
        if (!b.lastAccessed) return -1;
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
      });
    } else if (activeSort === "category") {
      apps.sort((a, b) => a.category.localeCompare(b.category));
    }

    return apps;
  }, [accessibleApps, filter, sort, search, user.favoriteApps]);

  const handleLaunch = (appId: string, url: string, appName: string) => {
    launchApp(appId);
    window.open(url, "_blank", "noopener,noreferrer");
    toaster.create({ title: `Launching ${appName}`, description: "Opening in a new tab...", type: "info" });
  };

  const handleFavorite = (appId: string) => {
    const isFav = user.favoriteApps.includes(appId);
    toggleFavorite(appId);
    toaster.create({
      title: isFav ? "Removed from favorites" : "Added to favorites",
      type: "success",
    });
  };

  const AppCard = ({ app }: { app: typeof applications[0] }) => {
    const isFav = user.favoriteApps.includes(app.id);
    return (
      <Box
        bg="bg.panel"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="border"
        p="5"
        _hover={{ shadow: "md", borderColor: "blue.300" }}
        transition="all 0.15s"
        position="relative"
      >
        <HStack justifyContent="space-between" mb="3">
          <Box fontSize="2xl">{app.icon}</Box>
          <HStack gap="1">
            <Button
              variant="ghost"
              size="xs"
              px="1.5"
              onClick={() => handleFavorite(app.id)}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              color={isFav ? "yellow.500" : "fg.muted"}
              _hover={{ color: "yellow.500" }}
            >
              <LuStar size={16} fill={isFav ? "currentColor" : "none"} />
            </Button>
            <Badge
              colorPalette={app.status === "active" ? "green" : app.status === "maintenance" ? "orange" : "red"}
              size="xs"
            >
              {app.status}
            </Badge>
          </HStack>
        </HStack>
        <Text fontWeight="bold" fontSize="md" mb="1">{app.name}</Text>
        <Text fontSize="sm" color="fg.muted" lineClamp={2} mb="3">{app.description}</Text>
        <HStack justifyContent="space-between" alignItems="center">
          <Badge variant="subtle" colorPalette="gray" size="xs">{app.category}</Badge>
          {app.lastAccessed && (
            <Text fontSize="xs" color="fg.subtle">
              {formatDistanceToNow(new Date(app.lastAccessed), { addSuffix: true })}
            </Text>
          )}
        </HStack>
        <Button
          mt="3"
          size="sm"
          colorPalette="blue"
          w="full"
          onClick={() => handleLaunch(app.id, app.url, app.name)}
          disabled={app.status === "inactive"}
        >
          <LuExternalLink size={14} />
          Launch
        </Button>
      </Box>
    );
  };

  const AppRow = ({ app }: { app: typeof applications[0] }) => {
    const isFav = user.favoriteApps.includes(app.id);
    return (
      <HStack
        bg="bg.panel"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border"
        p="4"
        gap="4"
        _hover={{ shadow: "sm", borderColor: "blue.300" }}
        transition="all 0.15s"
      >
        <Box fontSize="2xl" flexShrink="0">{app.icon}</Box>
        <VStack gap="0" alignItems="start" flex="1" minW="0">
          <Text fontWeight="semibold">{app.name}</Text>
          <Text fontSize="sm" color="fg.muted" truncate w="full">{app.description}</Text>
        </VStack>
        <Badge variant="subtle" colorPalette="gray" size="sm" display={{ base: "none", sm: "flex" }}>
          {app.category}
        </Badge>
        <Badge
          colorPalette={app.status === "active" ? "green" : app.status === "maintenance" ? "orange" : "red"}
          size="sm"
        >
          {app.status}
        </Badge>
        <HStack gap="2" flexShrink="0">
          <Button
            variant="ghost"
            size="sm"
            px="2"
            onClick={() => handleFavorite(app.id)}
            color={isFav ? "yellow.500" : "fg.muted"}
            _hover={{ color: "yellow.500" }}
          >
            <LuStar size={16} fill={isFav ? "currentColor" : "none"} />
          </Button>
          <Button
            size="sm"
            colorPalette="blue"
            onClick={() => handleLaunch(app.id, app.url, app.name)}
            disabled={app.status === "inactive"}
          >
            <LuExternalLink size={14} />
            Launch
          </Button>
        </HStack>
      </HStack>
    );
  };

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1400px" mx="auto">
      <HStack justifyContent="space-between" mb="6" flexWrap="wrap" gap="4">
        <VStack alignItems="start" gap="1">
          <Heading size="xl" fontWeight="bold">My Applications</Heading>
          <Text color="fg.muted">{accessibleApps.length} apps accessible to your role</Text>
        </VStack>
      </HStack>

      {/* Toolbar */}
      <HStack gap="3" mb="6" flexWrap="wrap">
        <Box flex={{ base: "full", sm: "1" }} minW="200px">
          <Box position="relative">
            <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" pointerEvents="none" color="fg.muted">
              <LuSearch size={16} />
            </Box>
            <Input
              placeholder="Search applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              pl="9"
            />
          </Box>
        </Box>

        <SelectRoot collection={filterCollection} value={filter} onValueChange={(d) => setFilter(d.value)} w="150px" size="sm">
          <SelectTrigger>
            <HStack gap="2">
              <LuFilter size={14} />
              <SelectValueText placeholder="Filter" />
            </HStack>
          </SelectTrigger>
          <SelectContent>
            {filterCollection.items.map((item) => (
              <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

        <SelectRoot collection={sortCollection} value={sort} onValueChange={(d) => setSort(d.value)} w="160px" size="sm">
          <SelectTrigger>
            <HStack gap="2">
              <LuArrowUpDown size={14} />
              <SelectValueText placeholder="Sort" />
            </HStack>
          </SelectTrigger>
          <SelectContent>
            {sortCollection.items.map((item) => (
              <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

        <HStack gap="1" bg="bg.panel" borderRadius="lg" p="1" borderWidth="1px" borderColor="border">
          <Button
            size="sm"
            variant={view === "grid" ? "solid" : "ghost"}
            colorPalette={view === "grid" ? "blue" : "gray"}
            px="2.5"
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <LuGrid3X3 size={16} />
          </Button>
          <Button
            size="sm"
            variant={view === "list" ? "solid" : "ghost"}
            colorPalette={view === "list" ? "blue" : "gray"}
            px="2.5"
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <LuList size={16} />
          </Button>
        </HStack>
      </HStack>

      {/* Results count */}
      <HStack mb="4" gap="2">
        <Text fontSize="sm" color="fg.muted">
          Showing {filteredApps.length} of {accessibleApps.length} apps
        </Text>
        {search && (
          <Badge colorPalette="blue" size="sm">
            Search: "{search}"
            <Button variant="ghost" size="2xs" ml="1" px="0" onClick={() => setSearch("")}>✕</Button>
          </Badge>
        )}
      </HStack>

      {/* App grid/list */}
      {filteredApps.length === 0 ? (
        <Box
          bg="bg.panel"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="border"
          py="16"
          textAlign="center"
        >
          <VStack gap="3" color="fg.muted">
            <LuGrid3X3 size={48} />
            <Heading size="md" color="fg.muted">No applications found</Heading>
            <Text fontSize="sm">
              {search ? `No results for "${search}"` : "No apps match the current filter"}
            </Text>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSearch(""); setFilter(["all"]); }}
            >
              Clear filters
            </Button>
          </VStack>
        </Box>
      ) : view === "grid" ? (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="4">
          {filteredApps.map((app) => <AppCard key={app.id} app={app} />)}
        </SimpleGrid>
      ) : (
        <VStack gap="2" alignItems="stretch">
          {filteredApps.map((app) => <AppRow key={app.id} app={app} />)}
        </VStack>
      )}
    </Box>
  );
}
