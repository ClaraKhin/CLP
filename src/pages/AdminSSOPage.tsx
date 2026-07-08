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
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import type { SSOProvider, ProviderType } from "@/store/types";
import {
  LuCircleCheck, LuCircleX, LuCircleAlert, LuRefreshCw, LuWifi,
  LuPlus, LuTrash2, LuPencil,
} from "react-icons/lu";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createListCollection } from "@chakra-ui/react";
import { generateId } from "@/lib/supabase";

const providerTypeCollection = createListCollection({
  items: [
    { label: "OAuth2 / OIDC", value: "oauth2" },
    { label: "SAML", value: "saml" },
  ],
});

export default function AdminSSOPage() {
  const { ssoProviders, updateSSOProvider, testSSOConnection, fetchAllData } = useStore();
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [localProviders, setLocalProviders] = useState<Record<string, SSOProvider>>(
    Object.fromEntries(ssoProviders.map((p) => [p.id, { ...p }]))
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    name: "",
    type: "oauth2" as ProviderType,
  });

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
    await updateSSOProvider(id, provider);
    setSaving(null);
    toaster.create({ title: `${provider.name} configuration saved`, type: "success" });
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    setField(id, "enabled", enabled);
    await updateSSOProvider(id, { enabled });
    toaster.create({
      title: `Provider ${enabled ? "enabled" : "disabled"}`,
      type: "info",
    });
  };

  const handleAddProvider = async () => {
    if (!addForm.name.trim()) {
      toaster.create({ title: "Provider name is required", type: "error" });
      return;
    }

    const { supabase } = await import("@/lib/supabase");
    const newId = generateId();

    await supabase.from("sso_providers").insert({
      id: newId,
      name: addForm.name,
      type: addForm.type,
      enabled: false,
      client_id: "",
      client_secret: "",
      authorization_url: "",
      token_url: "",
      user_info_url: "",
      scopes: ["openid", "email", "profile"],
      test_status: "untested",
    });

    setShowAddDialog(false);
    setAddForm({ name: "", type: "oauth2" });
    toaster.create({ title: "SSO provider created", type: "success" });
    await fetchAllData();
    setExpanded(newId);
  };

  const handleDeleteProvider = async () => {
    if (!deleteTarget) return;

    const { supabase } = await import("@/lib/supabase");
    await supabase.from("sso_providers").delete().eq("id", deleteTarget);

    setLocalProviders((lp) => {
      const updated = { ...lp };
      delete updated[deleteTarget];
      return updated;
    });

    setDeleteTarget(null);
    toaster.create({ title: "SSO provider deleted", type: "success" });
    await fetchAllData();
  };

  const testStatusIcon = (s?: string) =>
    s === "success" ? <LuCircleCheck size={14} color="var(--chakra-colors-green-500)" /> :
    s === "failed" ? <LuCircleX size={14} color="var(--chakra-colors-red-500)" /> :
    <LuCircleAlert size={14} color="var(--chakra-colors-gray-400)" />;

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1000px" mx="auto">
      <HStack justifyContent="space-between" mb="6" flexWrap="wrap" gap="4">
        <VStack alignItems="start" gap="1">
          <Heading size="xl" fontWeight="bold">SSO Configuration</Heading>
          <Text color="fg.muted">Configure external identity providers for single sign-on</Text>
        </VStack>
        <Button colorPalette="blue" onClick={() => setShowAddDialog(true)}>
          <LuPlus size={16} /> Add Provider
        </Button>
      </HStack>

      {/* Info Banner */}
      <Box
        p="4"
        bg="blue.950"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="blue.800"
        mb="4"
      >
        <HStack gap="3">
          <LuWifi size={18} color="var(--chakra-colors-blue-400)" />
          <VStack alignItems="start" gap="0.5">
            <Text fontSize="sm" fontWeight="semibold">SSO Provider Configuration</Text>
            <Text fontSize="xs" color="fg.muted">
              Configure OAuth2/OIDC or SAML providers. Users will be able to sign in using these identity providers.
              All credentials are stored securely in your Supabase database.
            </Text>
          </VStack>
        </HStack>
      </Box>

      {ssoProviders.length === 0 ? (
        <Box
          p="12"
          bg="bg.panel"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="border"
          textAlign="center"
        >
          <Box
            w="16"
            h="16"
            bg="bg.muted"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
            mb="4"
          >
            <LuWifi size={32} color="var(--chakra-colors-fg-muted)" />
          </Box>
          <Text fontWeight="semibold" mb="2">No SSO Providers</Text>
          <Text fontSize="sm" color="fg.muted" mb="4">
            Add an SSO provider to enable social login for your users
          </Text>
          <Button colorPalette="blue" onClick={() => setShowAddDialog(true)}>
            <LuPlus size={16} /> Add Your First Provider
          </Button>
        </Box>
      ) : (
        <VStack gap="4" alignItems="stretch">
          {ssoProviders.map((providerBase) => {
            const p = localProviders[providerBase.id] || providerBase;
            const isExpanded = expanded === p.id;
            const isSAML = p.type === "saml";

            return (
              <Box key={p.id} bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor={p.enabled ? "blue.500" : "border"} overflow="hidden">
                {/* Provider Header */}
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
                      bg={p.enabled ? "blue.950" : "bg.muted"}
                      borderRadius="lg"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <LuWifi size={18} color={p.enabled ? "var(--chakra-colors-blue-400)" : "var(--chakra-colors-fg-muted)"} />
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
                    <Button
                      variant="ghost"
                      size="xs"
                      colorPalette="red"
                      onClick={() => setDeleteTarget(p.id)}
                    >
                      <LuTrash2 size={14} />
                    </Button>
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

                {/* Expanded Configuration */}
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
      )}

      {/* Add Provider Dialog */}
      <DialogRoot open={showAddDialog} onOpenChange={(d) => setShowAddDialog(d.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SSO Provider</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap="4">
              <Field label="Provider Name" w="full">
                <Input
                  placeholder="e.g., Google, Okta, Azure AD"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Field>
              <Field label="Provider Type" w="full">
                <SelectRoot
                  collection={providerTypeCollection}
                  value={[addForm.type]}
                  onValueChange={(d) => setAddForm((f) => ({ ...f, type: d.value[0] as ProviderType }))}
                  w="full"
                >
                  <SelectTrigger>
                    <SelectValueText />
                  </SelectTrigger>
                  <SelectContent>
                    {providerTypeCollection.items.map((item) => (
                      <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Field>
              <Text fontSize="sm" color="fg.muted">
                {addForm.type === "oauth2"
                  ? "OAuth2/OIDC providers require Client ID, Client Secret, and endpoint URLs."
                  : "SAML providers require Entity ID, SSO URL, and X.509 Certificate."}
              </Text>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button colorPalette="blue" onClick={handleAddProvider}>
              Add Provider
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* Delete Confirmation Dialog */}
      <DialogRoot open={!!deleteTarget} onOpenChange={(d) => !d.open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SSO Provider</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text>Are you sure you want to delete this SSO provider? Users will no longer be able to sign in using this provider.</Text>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button colorPalette="red" onClick={handleDeleteProvider}>Delete Provider</Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}
