import { useState } from "react";
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
  Textarea,
  Switch,
  Separator,
  Code,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import type { SSOProvider } from "@/store/types";
import {
  LuCircleCheck, LuCircleX, LuCircleAlert, LuRefreshCw, LuWifi, LuKeyRound, LuCopy,
} from "react-icons/lu";

export default function AdminSSOPage() {
  const { ssoProviders, updateSSOProvider, testSSOConnection } = useStore();
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(ssoProviders[0]?.id || null);
  const [localProviders, setLocalProviders] = useState<Record<string, SSOProvider>>(
    Object.fromEntries(ssoProviders.map((p) => [p.id, { ...p }]))
  );

  const setField = (id: string, field: keyof SSOProvider, value: unknown) => {
    setLocalProviders((lp) => ({ ...lp, [id]: { ...lp[id], [field]: value } }));
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    const result = await testSSOConnection(id);
    setTesting(null);
    toaster.create({
      title: result.success ? "Connection Successful" : "Connection Failed",
      description: result.message,
      type: result.success ? "success" : "error",
    });
  };

  const handleSave = async (id: string) => {
    const provider = localProviders[id];
    setSaving(id);
    await new Promise((r) => setTimeout(r, 700));
    updateSSOProvider(id, provider);
    setSaving(null);
    toaster.create({ title: `${provider.name} configuration saved`, type: "success" });
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    setField(id, "enabled", enabled);
    updateSSOProvider(id, { enabled });
    toaster.create({
      title: `Provider ${enabled ? "enabled" : "disabled"}`,
      type: "info",
    });
  };

  const testStatusColor = (s?: string) =>
    s === "success" ? "green" : s === "failed" ? "red" : "gray";

  const testStatusIcon = (s?: string) =>
    s === "success" ? <LuCircleCheck size={14} color="var(--chakra-colors-green-500)" /> :
    s === "failed" ? <LuCircleX size={14} color="var(--chakra-colors-red-500)" /> :
    <LuCircleAlert size={14} color="var(--chakra-colors-gray-400)" />;

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1000px" mx="auto">
      <VStack alignItems="start" gap="1" mb="6">
        <Heading size="xl" fontWeight="bold">SSO Configuration</Heading>
        <Text color="fg.muted">Configure external identity providers for single sign-on</Text>
      </VStack>

      {/* SuperTokens Configuration Section */}
      <SuperTokensConfigSection />

      <Separator my="2" />

      <VStack gap="4" alignItems="stretch">
        {ssoProviders.map((providerBase) => {
          const p = localProviders[providerBase.id] || providerBase;
          const isExpanded = expanded === p.id;
          const isSAML = p.type === "saml";

          return (
            <Box key={p.id} bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor={p.enabled ? "blue.200" : "border"} overflow="hidden">
              {/* Header */}
              <HStack
                p="5"
                cursor="pointer"
                onClick={() => setExpanded(isExpanded ? null : p.id)}
                _hover={{ bg: "bg.subtle" }}
                justifyContent="space-between"
                flexWrap="wrap"
                gap="3"
              >
                <HStack gap="4">
                  <Box
                    w="10"
                    h="10"
                    bg={p.enabled ? "blue.50" : "bg.muted"}
                    _dark={{ bg: p.enabled ? "blue.950" : "bg.muted" }}
                    borderRadius="lg"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <LuWifi size={18} color={p.enabled ? "var(--chakra-colors-blue-500)" : "var(--chakra-colors-fg-muted)"} />
                  </Box>
                  <VStack gap="0.5" alignItems="start">
                    <HStack gap="2">
                      <Text fontWeight="bold">{p.name}</Text>
                      <Badge colorPalette="gray" size="xs" textTransform="uppercase">{p.type}</Badge>
                    </HStack>
                    <HStack gap="2">
                      <Badge colorPalette={p.enabled ? "green" : "gray"} size="xs">
                        {p.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      {p.testStatus && (
                        <HStack gap="1">
                          {testStatusIcon(p.testStatus)}
                          <Text fontSize="xs" color="fg.muted">
                            Last test: {p.testStatus}
                          </Text>
                        </HStack>
                      )}
                    </HStack>
                  </VStack>
                </HStack>

                <HStack gap="3" onClick={(e) => e.stopPropagation()}>
                  <Switch.Root
                    checked={p.enabled}
                    onCheckedChange={(d) => handleToggleEnabled(p.id, d.checked)}
                    colorPalette="blue"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Label fontSize="sm">{p.enabled ? "Active" : "Inactive"}</Switch.Label>
                  </Switch.Root>
                </HStack>
              </HStack>

              {/* Expanded config */}
              {isExpanded && (
                <Box p="5" borderTopWidth="1px" borderColor="border">
                  {!isSAML ? (
                    <VStack gap="4">
                      <SimpleGrid columns={{ base: 1, md: 2 }} gap="4" w="full">
                        <Field label="Client ID" w="full">
                          <Input
                            value={p.clientId}
                            onChange={(e) => setField(p.id, "clientId", e.target.value)}
                            placeholder="your-client-id"
                            fontFamily="mono"
                            fontSize="sm"
                          />
                        </Field>
                        <Field label="Client Secret" w="full">
                          <Input
                            type="password"
                            value={p.clientSecret}
                            onChange={(e) => setField(p.id, "clientSecret", e.target.value)}
                            placeholder="your-client-secret"
                            fontFamily="mono"
                            fontSize="sm"
                          />
                        </Field>
                      </SimpleGrid>
                      <Field label="Authorization URL" w="full">
                        <Input
                          value={p.authorizationUrl}
                          onChange={(e) => setField(p.id, "authorizationUrl", e.target.value)}
                          placeholder="https://provider.com/oauth/authorize"
                          fontFamily="mono"
                          fontSize="sm"
                        />
                      </Field>
                      <Field label="Token URL" w="full">
                        <Input
                          value={p.tokenUrl}
                          onChange={(e) => setField(p.id, "tokenUrl", e.target.value)}
                          placeholder="https://provider.com/oauth/token"
                          fontFamily="mono"
                          fontSize="sm"
                        />
                      </Field>
                      <Field label="User Info URL" w="full">
                        <Input
                          value={p.userInfoUrl}
                          onChange={(e) => setField(p.id, "userInfoUrl", e.target.value)}
                          placeholder="https://provider.com/userinfo"
                          fontFamily="mono"
                          fontSize="sm"
                        />
                      </Field>
                      <Field label="Scopes (comma separated)" w="full">
                        <Input
                          value={p.scopes.join(", ")}
                          onChange={(e) => setField(p.id, "scopes", e.target.value.split(",").map((s) => s.trim()))}
                          placeholder="openid, email, profile"
                          fontFamily="mono"
                          fontSize="sm"
                        />
                      </Field>
                    </VStack>
                  ) : (
                    <VStack gap="4">
                      <Field label="Entity ID" w="full">
                        <Input
                          value={p.entityId || ""}
                          onChange={(e) => setField(p.id, "entityId", e.target.value)}
                          placeholder="https://provider.com/entity-id"
                          fontFamily="mono"
                          fontSize="sm"
                        />
                      </Field>
                      <Field label="SSO URL" w="full">
                        <Input
                          value={p.ssoUrl || ""}
                          onChange={(e) => setField(p.id, "ssoUrl", e.target.value)}
                          placeholder="https://provider.com/sso/saml"
                          fontFamily="mono"
                          fontSize="sm"
                        />
                      </Field>
                      <Field label="X.509 Certificate" w="full">
                        <Textarea
                          value={p.certificate || ""}
                          onChange={(e) => setField(p.id, "certificate", e.target.value)}
                          placeholder="-----BEGIN CERTIFICATE-----..."
                          fontFamily="mono"
                          fontSize="xs"
                          rows={4}
                        />
                      </Field>
                      <Field label="SP Metadata XML (optional)" w="full">
                        <Textarea
                          value={p.metadata || ""}
                          onChange={(e) => setField(p.id, "metadata", e.target.value)}
                          placeholder="<EntityDescriptor>...</EntityDescriptor>"
                          fontFamily="mono"
                          fontSize="xs"
                          rows={3}
                        />
                      </Field>
                    </VStack>
                  )}

                  <HStack mt="5" gap="3" justifyContent="end">
                    <Button
                      variant="outline"
                      onClick={() => handleTest(p.id)}
                      loading={testing === p.id}
                      loadingText="Testing..."
                    >
                      <LuRefreshCw size={14} /> Test Connection
                    </Button>
                    <Button
                      colorPalette="blue"
                      onClick={() => handleSave(p.id)}
                      loading={saving === p.id}
                      loadingText="Saving..."
                    >
                      Save Configuration
                    </Button>
                  </HStack>
                </Box>
              )}
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}

// ─── SuperTokens Configuration Sub-Component ───────────────────────────────

const ST_PROVIDERS = [
  { id: "google", label: "Google", color: "#4285f4", icon: "G", description: "Sign in with Google OAuth2" },
  { id: "github", label: "GitHub", color: "#24292e", icon: "", description: "Sign in with GitHub OAuth2" },
  { id: "apple", label: "Apple", color: "#000000", icon: "", description: "Sign in with Apple ID" },
  { id: "facebook", label: "Facebook", color: "#1877f2", icon: "f", description: "Sign in with Facebook" },
];

function SuperTokensConfigSection() {
  const [apiDomain, setApiDomain] = useState(
    import.meta.env.VITE_SUPERTOKENS_API_DOMAIN || "http://localhost:3001"
  );
  const [apiBasePath, setApiBasePath] = useState("/auth");
  const [enabledProviders, setEnabledProviders] = useState<Record<string, boolean>>({
    google: true, github: true, apple: false, facebook: false,
  });
  const [providerConfigs, setProviderConfigs] = useState<Record<string, { clientId: string; clientSecret: string }>>({
    google: { clientId: "", clientSecret: "" },
    github: { clientId: "", clientSecret: "" },
    apple: { clientId: "", clientSecret: "" },
    facebook: { clientId: "", clientSecret: "" },
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleProvider = (id: string) => {
    setEnabledProviders((p) => ({ ...p, [id]: !p[id] }));
  };

  const setProviderField = (id: string, field: "clientId" | "clientSecret", value: string) => {
    setProviderConfigs((p) => ({ ...p, [id]: { ...p[id], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    toaster.create({
      title: "SuperTokens configuration saved",
      description: `API domain: ${apiDomain}${apiBasePath}`,
      type: "success",
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${apiDomain}${apiBasePath}/healthcheck`, { signal: AbortSignal.timeout(3000) });
      setTesting(false);
      if (res.ok) {
        toaster.create({ title: "SuperTokens backend reachable", description: apiDomain, type: "success" });
      } else {
        toaster.create({ title: "Backend responded with error", description: `HTTP ${res.status}`, type: "error" });
      }
    } catch {
      setTesting(false);
      toaster.create({
        title: "Backend not reachable",
        description: `Cannot connect to ${apiDomain}. Start a SuperTokens backend or update the API domain.`,
        type: "warning",
      });
    }
  };

  const copySnippet = (text: string) => {
    navigator.clipboard.writeText(text).then(() =>
      toaster.create({ title: "Copied to clipboard", type: "success" })
    );
  };

  const initSnippet = `SuperTokens.init({
  appInfo: {
    appName: "Central SSO Portal",
    apiDomain: "${apiDomain}",
    websiteDomain: window.location.origin,
    apiBasePath: "${apiBasePath}",
    websiteBasePath: "/auth",
  },
  recipeList: [
    ThirdParty.init({
      signInAndUpFeature: {
        providers: [${Object.entries(enabledProviders).filter(([,v]) => v).map(([k]) => `\n          ThirdParty.${k.charAt(0).toUpperCase() + k.slice(1)}.init()`).join(",")}
        ],
      },
    }),
    Session.init(),
  ],
});`;

  return (
    <Box bg="bg.panel" borderRadius="xl" borderWidth="2px" borderColor="purple.200" _dark={{ borderColor: "purple.800" }} overflow="hidden" mb="2">
      {/* Header */}
      <HStack
        p="5"
        bg="purple.50"
        _dark={{ bg: "purple.950" }}
        justifyContent="space-between"
        flexWrap="wrap"
        gap="3"
      >
        <HStack gap="3">
          <Box
            w="10" h="10"
            borderRadius="xl"
            bgGradient="linear(135deg, purple.500, purple.700)"
            display="flex" alignItems="center" justifyContent="center"
          >
            <LuKeyRound size={18} color="white" />
          </Box>
          <VStack gap="0" alignItems="start">
            <HStack gap="2">
              <Heading size="sm">SuperTokens SSO</Heading>
              <Badge colorPalette="purple" size="sm" variant="solid">Active</Badge>
            </HStack>
            <Text fontSize="xs" color="fg.muted">
              Open-source auth · ThirdParty recipe · supertokens.com
            </Text>
          </VStack>
        </HStack>
        <HStack gap="2">
          <Button
            size="sm"
            variant="outline"
            colorPalette="purple"
            onClick={handleTestConnection}
            loading={testing}
            loadingText="Testing..."
          >
            <LuRefreshCw size={14} /> Test Connection
          </Button>
          <Button
            size="sm"
            colorPalette="purple"
            onClick={handleSave}
            loading={saving}
            loadingText="Saving..."
          >
            Save Config
          </Button>
        </HStack>
      </HStack>

      <Box p="5">
        <VStack gap="5">
          {/* API Domain config */}
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="4" w="full">
            <Field label="SuperTokens API Domain">
              <Input
                value={apiDomain}
                onChange={(e) => setApiDomain(e.target.value)}
                placeholder="http://localhost:3001"
                fontFamily="mono"
                fontSize="sm"
              />
            </Field>
            <Field label="API Base Path">
              <Input
                value={apiBasePath}
                onChange={(e) => setApiBasePath(e.target.value)}
                placeholder="/auth"
                fontFamily="mono"
                fontSize="sm"
              />
            </Field>
          </SimpleGrid>

          <Separator />

          {/* Provider toggles */}
          <Box w="full">
            <Text fontWeight="semibold" fontSize="sm" mb="3">Social SSO Providers</Text>
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap="3">
              {ST_PROVIDERS.map((prov) => (
                <Box
                  key={prov.id}
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor={enabledProviders[prov.id] ? "purple.200" : "border"}
                  _dark={{ borderColor: enabledProviders[prov.id] ? "purple.700" : "border" }}
                  overflow="hidden"
                >
                  <HStack
                    p="3"
                    bg={enabledProviders[prov.id] ? "purple.50" : "bg.subtle"}
                    _dark={{ bg: enabledProviders[prov.id] ? "purple.950" : "bg.subtle" }}
                    justifyContent="space-between"
                    cursor="pointer"
                    onClick={() => setExpanded(expanded === prov.id ? null : prov.id)}
                  >
                    <HStack gap="3">
                      <Box
                        w="8" h="8"
                        borderRadius="lg"
                        bg={prov.color}
                        display="flex" alignItems="center" justifyContent="center"
                        color="white"
                        fontSize="sm"
                        fontWeight="bold"
                        flexShrink="0"
                      >
                        {prov.icon || prov.label[0]}
                      </Box>
                      <VStack gap="0" alignItems="start">
                        <Text fontSize="sm" fontWeight="semibold">{prov.label}</Text>
                        <Text fontSize="xs" color="fg.muted">{prov.description}</Text>
                      </VStack>
                    </HStack>
                    <Switch.Root
                      checked={enabledProviders[prov.id]}
                      onCheckedChange={() => { toggleProvider(prov.id); }}
                      colorPalette="purple"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control><Switch.Thumb /></Switch.Control>
                    </Switch.Root>
                  </HStack>

                  {/* Expanded credentials */}
                  {expanded === prov.id && (
                    <Box p="3" borderTopWidth="1px" borderColor="border">
                      <SimpleGrid columns={1} gap="3">
                        <Field label="Client ID">
                          <Input
                            value={providerConfigs[prov.id].clientId}
                            onChange={(e) => setProviderField(prov.id, "clientId", e.target.value)}
                            placeholder={`${prov.label} OAuth2 client ID`}
                            size="sm"
                            fontFamily="mono"
                          />
                        </Field>
                        <Field label="Client Secret">
                          <Input
                            type="password"
                            value={providerConfigs[prov.id].clientSecret}
                            onChange={(e) => setProviderField(prov.id, "clientSecret", e.target.value)}
                            placeholder="••••••••••••"
                            size="sm"
                            fontFamily="mono"
                          />
                        </Field>
                      </SimpleGrid>
                    </Box>
                  )}
                </Box>
              ))}
            </SimpleGrid>
          </Box>

          <Separator />

          {/* Init snippet */}
          <Box w="full">
            <HStack justifyContent="space-between" mb="2">
              <Text fontWeight="semibold" fontSize="sm">Generated Init Snippet</Text>
              <Button
                size="xs"
                variant="outline"
                onClick={() => copySnippet(initSnippet)}
              >
                <LuCopy size={12} /> Copy
              </Button>
            </HStack>
            <Box
              as="pre"
              p="4"
              bg="gray.950"
              _dark={{ bg: "gray.900" }}
              borderRadius="xl"
              borderWidth="1px"
              borderColor="border"
              fontSize="xs"
              color="green.300"
              fontFamily="mono"
              overflowX="auto"
              whiteSpace="pre"
              lineHeight="1.6"
            >
              {initSnippet}
            </Box>
          </Box>

          {/* Docs callout */}
          <Box
            w="full"
            p="4"
            bg="purple.50"
            _dark={{ bg: "purple.950" }}
            borderRadius="xl"
            borderWidth="1px"
            borderColor="purple.200"
            _dark2={{ borderColor: "purple.800" }}
          >
            <HStack gap="3" flexWrap="wrap">
              <LuKeyRound size={16} color="var(--chakra-colors-purple-500)" />
              <VStack gap="0.5" alignItems="start" flex="1">
                <Text fontSize="sm" fontWeight="semibold">Backend setup required</Text>
                <Text fontSize="xs" color="fg.muted">
                  SuperTokens SSO requires a running backend. Run{" "}
                  <Code fontSize="xs">npx create-supertokens-app</Code>{" "}
                  or follow the{" "}
                  <Text as="span" color="purple.500" cursor="pointer" textDecoration="underline"
                    onClick={() => window.open("https://supertokens.com/docs/quickstart/backend-setup", "_blank", "noopener,noreferrer")}>
                    backend setup guide
                  </Text>.
                </Text>
              </VStack>
            </HStack>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
}
