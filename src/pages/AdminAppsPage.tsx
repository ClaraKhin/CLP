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
  Textarea,
  Checkbox,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import {
  DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogCloseTrigger,
} from "@/components/ui/dialog";
import {
  SelectRoot, SelectTrigger, SelectValueText, SelectContent, SelectItem,
} from "@/components/ui/select";
import { createListCollection } from "@chakra-ui/react";
import { ClipboardRoot, ClipboardButton, ClipboardInput } from "@/components/ui/clipboard";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import type { Application, UserRole } from "@/store/types";
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw, LuSearch, LuExternalLink } from "react-icons/lu";

const emptyForm = {
  name: "",
  description: "",
  icon: "🔷",
  category: "",
  url: "",
  baseUrl: "",
  callbackUrl: "",
  clientId: "",
  allowedRoles: [] as UserRole[],
};

const statusOptions = createListCollection({
  items: [
    { label: "All Status", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Maintenance", value: "maintenance" },
  ],
});

const allRoles: UserRole[] = ["super_admin", "admin", "user", "viewer"];

export default function AdminAppsPage() {
  const { applications, addApplication, updateApplication, deleteApplication, regenerateSecretKey } = useStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(["all"]);
  const [showModal, setShowModal] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [formStatus, setFormStatus] = useState<string[]>(["active"]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let list = [...applications];
    const sf = statusFilter[0];
    if (sf && sf !== "all") list = list.filter((a) => a.status === sf);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
    }
    return list;
  }, [applications, search, statusFilter]);

  const openAdd = () => {
    setEditingApp(null);
    setForm(emptyForm);
    setFormStatus(["active"]);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (app: Application) => {
    setEditingApp(app);
    setForm({
      name: app.name,
      description: app.description,
      icon: app.icon,
      category: app.category,
      url: app.url,
      baseUrl: app.baseUrl,
      callbackUrl: app.callbackUrl,
      clientId: app.clientId,
      allowedRoles: app.allowedRoles,
    });
    setFormStatus([app.status]);
    setFormErrors({});
    setShowModal(true);
  };

  const toggleRole = (role: UserRole) => {
    setForm((f) => ({
      ...f,
      allowedRoles: f.allowedRoles.includes(role)
        ? f.allowedRoles.filter((r) => r !== role)
        : [...f.allowedRoles, role],
    }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.url.trim()) errs.url = "Required";
    if (!form.baseUrl.trim()) errs.baseUrl = "Required";
    if (!form.callbackUrl.trim()) errs.callbackUrl = "Required";
    if (!form.category.trim()) errs.category = "Required";
    if (form.allowedRoles.length === 0) errs.roles = "Select at least one role";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    const status = (formStatus[0] || "active") as Application["status"];
    if (editingApp) {
      updateApplication(editingApp.id, { ...form, status });
      toaster.create({ title: "Application updated", type: "success" });
    } else {
      addApplication({
        ...form,
        status,
        secretKey: "sk_live_" + Math.random().toString(36).slice(2, 26),
        lastAccessed: undefined,
      });
      toaster.create({ title: "Application created", type: "success" });
    }
    setLoading(false);
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await new Promise((r) => setTimeout(r, 500));
    deleteApplication(deleteTarget);
    setDeleteTarget(null);
    toaster.create({ title: "Application deleted", type: "success" });
  };

  const handleRegen = async (appId: string) => {
    setRegenLoading(appId);
    await new Promise((r) => setTimeout(r, 800));
    regenerateSecretKey(appId);
    setRegenLoading(null);
    toaster.create({ title: "Secret key regenerated", type: "success" });
  };

  const statusColor = (s: string) =>
    s === "active" ? "green" : s === "maintenance" ? "orange" : "red";

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1400px" mx="auto">
      <HStack justifyContent="space-between" mb="6" flexWrap="wrap" gap="4">
        <VStack alignItems="start" gap="1">
          <Heading size="xl" fontWeight="bold">Application Management</Heading>
          <Text color="fg.muted">{applications.length} applications registered</Text>
        </VStack>
        <Button colorPalette="blue" onClick={openAdd}>
          <LuPlus size={16} /> Add Application
        </Button>
      </HStack>

      <HStack gap="3" mb="5" flexWrap="wrap">
        <Box position="relative" flex="1" minW="200px">
          <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" pointerEvents="none" color="fg.muted">
            <LuSearch size={16} />
          </Box>
          <Input placeholder="Search applications..." value={search} onChange={(e) => setSearch(e.target.value)} pl="9" size="sm" />
        </Box>
        <SelectRoot collection={statusOptions} value={statusFilter} onValueChange={(d) => setStatusFilter(d.value)} size="sm" w="150px">
          <SelectTrigger><SelectValueText placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {statusOptions.items.map((i) => <SelectItem key={i.value} item={i}>{i.label}</SelectItem>)}
          </SelectContent>
        </SelectRoot>
      </HStack>

      {filtered.length === 0 ? (
        <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" py="16" textAlign="center">
          <Text color="fg.muted">No applications found</Text>
        </Box>
      ) : (
        <VStack gap="4" alignItems="stretch">
          {filtered.map((app) => (
            <Box key={app.id} bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="5" _hover={{ shadow: "sm" }} transition="shadow 0.15s">
              <HStack gap="4" flexWrap="wrap" justifyContent="space-between" mb="4">
                <HStack gap="3">
                  <Box fontSize="2xl">{app.icon}</Box>
                  <VStack gap="0.5" alignItems="start">
                    <HStack gap="2">
                      <Text fontWeight="bold">{app.name}</Text>
                      <Badge colorPalette={statusColor(app.status)} size="sm">{app.status}</Badge>
                    </HStack>
                    <Text fontSize="sm" color="fg.muted">{app.description}</Text>
                    <HStack gap="1" mt="0.5">
                      <Badge variant="subtle" colorPalette="gray" size="xs">{app.category}</Badge>
                      {app.allowedRoles.map((r) => (
                        <Badge key={r} variant="subtle" colorPalette="blue" size="xs">{r.replace("_", " ")}</Badge>
                      ))}
                    </HStack>
                  </VStack>
                </HStack>
                <HStack gap="2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(app.url, "_blank", "noopener,noreferrer")}
                    aria-label="Open app"
                  >
                    <LuExternalLink size={14} /> Launch
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(app)}><LuPencil size={14} /> Edit</Button>
                  <Button size="sm" colorPalette="red" variant="outline" onClick={() => setDeleteTarget(app.id)}><LuTrash2 size={14} /></Button>
                </HStack>
              </HStack>

              {/* Config details */}
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="3">
                {[
                  { label: "Base URL", value: app.baseUrl },
                  { label: "Callback URL", value: app.callbackUrl },
                  { label: "Client ID", value: app.clientId },
                ].map(({ label, value }) => (
                  <Box key={label}>
                    <Text fontSize="xs" color="fg.muted" mb="1">{label}</Text>
                    <ClipboardRoot value={value}>
                      <HStack gap="1">
                        <ClipboardInput asChild>
                          <Input size="xs" value={value} readOnly fontSize="xs" fontFamily="mono" />
                        </ClipboardInput>
                        <ClipboardButton size="xs" />
                      </HStack>
                    </ClipboardRoot>
                  </Box>
                ))}
                <Box gridColumn={{ md: "span 2", lg: "span 3" }}>
                  <Text fontSize="xs" color="fg.muted" mb="1">Secret Key</Text>
                  <HStack gap="2">
                    <ClipboardRoot value={app.secretKey} flex="1">
                      <HStack gap="1" w="full">
                        <ClipboardInput asChild>
                          <Input size="xs" value={app.secretKey} readOnly fontSize="xs" fontFamily="mono" type="password" />
                        </ClipboardInput>
                        <ClipboardButton size="xs" />
                      </HStack>
                    </ClipboardRoot>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleRegen(app.id)}
                      loading={regenLoading === app.id}
                      loadingText="..."
                    >
                      <LuRefreshCw size={12} /> Regenerate
                    </Button>
                  </HStack>
                </Box>
              </SimpleGrid>
            </Box>
          ))}
        </VStack>
      )}

      {/* Create/Edit Modal */}
      <DialogRoot open={showModal} onOpenChange={(d) => setShowModal(d.open)} size="xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingApp ? `Edit: ${editingApp.name}` : "Add Application"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <DialogBody>
              <VStack gap="4">
                <SimpleGrid columns={2} gap="4" w="full">
                  <Field label="App Name" invalid={!!formErrors.name} errorText={formErrors.name}>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Slack" />
                  </Field>
                  <Field label="Icon (emoji)">
                    <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="💬" />
                  </Field>
                </SimpleGrid>
                <Field label="Description" w="full">
                  <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="What is this application for?" />
                </Field>
                <SimpleGrid columns={2} gap="4" w="full">
                  <Field label="Category" invalid={!!formErrors.category} errorText={formErrors.category}>
                    <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Communication" />
                  </Field>
                  <Field label="Status">
                    <SelectRoot collection={createListCollection({ items: [{ label: "Active", value: "active" }, { label: "Maintenance", value: "maintenance" }, { label: "Inactive", value: "inactive" }] })} value={formStatus} onValueChange={(d) => setFormStatus(d.value)} w="full">
                      <SelectTrigger><SelectValueText /></SelectTrigger>
                      <SelectContent>
                        {[{ label: "Active", value: "active" }, { label: "Maintenance", value: "maintenance" }, { label: "Inactive", value: "inactive" }].map((i) => <SelectItem key={i.value} item={i}>{i.label}</SelectItem>)}
                      </SelectContent>
                    </SelectRoot>
                  </Field>
                </SimpleGrid>
                <Field label="Application URL" invalid={!!formErrors.url} errorText={formErrors.url} w="full">
                  <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://app.example.com" />
                </Field>
                <Field label="Base URL" invalid={!!formErrors.baseUrl} errorText={formErrors.baseUrl} w="full">
                  <Input value={form.baseUrl} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} placeholder="https://api.example.com" />
                </Field>
                <Field label="Callback URL" invalid={!!formErrors.callbackUrl} errorText={formErrors.callbackUrl} w="full">
                  <Input value={form.callbackUrl} onChange={(e) => setForm((f) => ({ ...f, callbackUrl: e.target.value }))} placeholder="https://app.example.com/oauth/callback" />
                </Field>
                <Field label="Client ID" w="full">
                  <Input value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} placeholder="client_123" />
                </Field>
                <Field label="Allowed Roles" invalid={!!formErrors.roles} errorText={formErrors.roles} w="full">
                  <HStack gap="3" flexWrap="wrap">
                    {allRoles.map((role) => (
                      <Checkbox
                        key={role}
                        checked={form.allowedRoles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                      >
                        {role.replace("_", " ")}
                      </Checkbox>
                    ))}
                  </HStack>
                </Field>
              </VStack>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" colorPalette="blue" loading={loading} loadingText="Saving...">
                {editingApp ? "Save Changes" : "Add Application"}
              </Button>
            </DialogFooter>
          </form>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* Delete Confirmation */}
      <DialogRoot open={!!deleteTarget} onOpenChange={(d) => !d.open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Application</DialogTitle></DialogHeader>
          <DialogBody>
            <Text>Are you sure you want to delete this application? Users will lose access immediately.</Text>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button colorPalette="red" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}
