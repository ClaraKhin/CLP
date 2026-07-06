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
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import type { SSOProvider } from "@/store/types";
import {
  LuCircleCheck, LuCircleX, LuCircleAlert, LuRefreshCw, LuWifi,
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
