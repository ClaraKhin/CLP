import { useState, useMemo, useRef, useEffect } from "react";
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
} from "@chakra-ui/react";
import { useStore } from "@/store/store";
import { LuSearch, LuExternalLink, LuStar, LuClock, LuGrid3X3 } from "react-icons/lu";
import { formatDistanceToNow } from "date-fns";
import { toaster } from "@/components/ui/toaster";

export default function AppLauncherPage() {
  const { auth, applications, toggleFavorite, launchApp } = useStore();
  const user = auth.user!;

  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userApps = useMemo(
    () => applications.filter((a) => a.allowedRoles.includes(user.role) && a.status !== "inactive"),
    [applications, user.role]
  );

  const recentApps = useMemo(
    () =>
      [...userApps]
        .filter((a) => a.lastAccessed)
        .sort((a, b) => new Date(b.lastAccessed!).getTime() - new Date(a.lastAccessed!).getTime())
        .slice(0, 6),
    [userApps]
  );

  const favoriteApps = useMemo(
    () => userApps.filter((a) => user.favoriteApps.includes(a.id)),
    [userApps, user.favoriteApps]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return userApps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [userApps, search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLaunch = (appId: string, url: string, appName: string) => {
    launchApp(appId);
    window.open(url, "_blank", "noopener,noreferrer");
    setSearch("");
    setShowDropdown(false);
    toaster.create({ title: `Launching ${appName}`, type: "info" });
  };

  const handleFavorite = (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    const isFav = user.favoriteApps.includes(appId);
    toggleFavorite(appId);
    toaster.create({ title: isFav ? "Removed from favorites" : "Added to favorites", type: "success" });
  };

  const AppTile = ({ app }: { app: typeof applications[0] }) => {
    const isFav = user.favoriteApps.includes(app.id);
    return (
      <Box
        bg="bg.panel"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="border"
        p="5"
        cursor="pointer"
        _hover={{ shadow: "lg", borderColor: "blue.300", transform: "translateY(-2px)" }}
        transition="all 0.15s"
        position="relative"
        onClick={() => handleLaunch(app.id, app.url, app.name)}
        textAlign="center"
      >
        <Button
          position="absolute"
          top="2"
          right="2"
          variant="ghost"
          size="xs"
          px="1.5"
          onClick={(e) => handleFavorite(e, app.id)}
          color={isFav ? "yellow.500" : "fg.subtle"}
          _hover={{ color: "yellow.500" }}
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <LuStar size={14} fill={isFav ? "currentColor" : "none"} />
        </Button>

        <Box fontSize="3xl" mb="2">{app.icon}</Box>
        <Text fontWeight="semibold" fontSize="sm" mb="1">{app.name}</Text>
        <Text fontSize="xs" color="fg.muted" lineClamp={2} mb="2">{app.description}</Text>
        <Badge
          colorPalette={app.status === "active" ? "green" : "orange"}
          size="xs"
          mb="2"
        >
          {app.status}
        </Badge>
        <Box mt="auto">
          <Button
            size="xs"
            colorPalette="blue"
            w="full"
            onClick={(e) => { e.stopPropagation(); handleLaunch(app.id, app.url, app.name); }}
          >
            <LuExternalLink size={12} /> Launch
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1200px" mx="auto">
      <VStack gap="2" mb="8" textAlign="center">
        <Heading size="2xl" fontWeight="bold">App Launcher</Heading>
        <Text color="fg.muted" fontSize="lg">Quick access to all your applications</Text>
      </VStack>

      {/* Search */}
      <Box maxW="600px" mx="auto" mb="10" position="relative">
        <Box position="relative">
          <Box position="absolute" left="4" top="50%" transform="translateY(-50%)" pointerEvents="none" color="fg.muted" zIndex="1">
            <LuSearch size={20} />
          </Box>
          <Input
            ref={inputRef}
            placeholder="Search for any application..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            pl="12"
            size="lg"
            fontSize="lg"
            borderRadius="2xl"
            boxShadow="md"
            _focus={{ boxShadow: "lg", borderColor: "blue.400" }}
          />
          {search && (
            <Button
              position="absolute"
              right="3"
              top="50%"
              transform="translateY(-50%)"
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setShowDropdown(false); }}
              px="2"
            >
              ✕
            </Button>
          )}
        </Box>

        {/* Autocomplete dropdown */}
        {showDropdown && search && (
          <Box
            ref={dropdownRef}
            position="absolute"
            top="calc(100% + 8px)"
            left="0"
            right="0"
            bg="bg.panel"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border"
            shadow="xl"
            zIndex="dropdown"
            overflow="hidden"
          >
            {searchResults.length === 0 ? (
              <Box p="4" textAlign="center" color="fg.muted">
                <Text fontSize="sm">No applications found for "{search}"</Text>
              </Box>
            ) : (
              searchResults.map((app) => (
                <HStack
                  key={app.id}
                  p="3"
                  cursor="pointer"
                  _hover={{ bg: "bg.subtle" }}
                  onClick={() => handleLaunch(app.id, app.url, app.name)}
                  borderTopWidth="1px"
                  borderColor="border"
                  _first={{ borderTopWidth: "0" }}
                  gap="3"
                >
                  <Box fontSize="xl">{app.icon}</Box>
                  <VStack gap="0" alignItems="start" flex="1">
                    <Text fontWeight="semibold" fontSize="sm">{app.name}</Text>
                    <Text fontSize="xs" color="fg.muted">{app.category}</Text>
                  </VStack>
                  <Badge colorPalette={app.status === "active" ? "green" : "orange"} size="xs">{app.status}</Badge>
                  <LuExternalLink size={14} color="var(--chakra-colors-fg-muted)" />
                </HStack>
              ))
            )}
          </Box>
        )}
      </Box>

      {/* Recently Used */}
      {recentApps.length > 0 && (
        <Box mb="8">
          <HStack gap="2" mb="4">
            <LuClock size={18} color="var(--chakra-colors-fg-muted)" />
            <Heading size="sm" color="fg.muted">Recently Used</Heading>
          </HStack>
          <SimpleGrid columns={{ base: 2, sm: 3, md: 6 }} gap="3">
            {recentApps.map((app) => (
              <Box
                key={app.id}
                bg="bg.panel"
                borderRadius="lg"
                borderWidth="1px"
                borderColor="border"
                p="3"
                cursor="pointer"
                _hover={{ borderColor: "blue.300", shadow: "sm" }}
                transition="all 0.15s"
                onClick={() => handleLaunch(app.id, app.url, app.name)}
                textAlign="center"
              >
                <Box fontSize="xl" mb="1">{app.icon}</Box>
                <Text fontSize="xs" fontWeight="semibold" truncate>{app.name}</Text>
                <Text fontSize="2xs" color="fg.subtle" mt="0.5">
                  {formatDistanceToNow(new Date(app.lastAccessed!), { addSuffix: true })}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Favorites */}
      {favoriteApps.length > 0 && (
        <Box mb="8">
          <HStack gap="2" mb="4">
            <LuStar size={18} color="var(--chakra-colors-yellow-500)" />
            <Heading size="sm" color="fg.muted">Favorites</Heading>
          </HStack>
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 6 }} gap="3">
            {favoriteApps.map((app) => <AppTile key={app.id} app={app} />)}
          </SimpleGrid>
        </Box>
      )}

      {/* All Applications */}
      <Box>
        <HStack gap="2" mb="4">
          <LuGrid3X3 size={18} color="var(--chakra-colors-fg-muted)" />
          <Heading size="sm" color="fg.muted">All Applications</Heading>
          <Badge colorPalette="gray" size="sm">{userApps.length}</Badge>
        </HStack>

        {/* Group by category */}
        {Array.from(new Set(userApps.map((a) => a.category))).map((category) => {
          const catApps = userApps.filter((a) => a.category === category);
          return (
            <Box key={category} mb="6">
              <Text fontSize="xs" fontWeight="semibold" color="fg.subtle" mb="3" textTransform="uppercase" letterSpacing="wide">
                {category}
              </Text>
              <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 6 }} gap="3">
                {catApps.map((app) => <AppTile key={app.id} app={app} />)}
              </SimpleGrid>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
