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
import { Field } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { Avatar } from "@/components/ui/avatar";
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
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import type { User, UserRole, UserStatus } from "@/store/types";
import { LuSearch, LuPlus, LuPencil, LuTrash2, LuChevronUp, LuChevronDown } from "react-icons/lu";
import { formatDistanceToNow } from "date-fns";

type SortKey = "name" | "email" | "role" | "status" | "createdAt";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "user" as UserRole,
  status: "active" as UserStatus,
  phone: "",
  department: "",
};

const statusOptions = createListCollection({
  items: [
    { label: "All Statuses", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Suspended", value: "suspended" },
  ],
});

export default function AdminUsersPage() {
  const { users, roles, addUser, updateUser, deleteUser, bulkDeleteUsers, bulkUpdateRole, bulkDeactivateUsers, auth } = useStore();

  const roleOptions = useMemo(() => createListCollection({
    items: roles.length > 0
      ? roles.map((r) => ({ label: r.name, value: r.name }))
      : [
          { label: "Super Admin", value: "super_admin" },
          { label: "Admin", value: "admin" },
          { label: "User", value: "user" },
          { label: "Viewer", value: "viewer" },
        ],
  }), [roles]);

  const roleFilterOptions = useMemo(() => createListCollection({
    items: roles.length > 0
      ? [{ label: "All Roles", value: "all" }, ...roles.map((r) => ({ label: r.name, value: r.name }))]
      : [
          { label: "All Roles", value: "all" },
          { label: "Super Admin", value: "super_admin" },
          { label: "Admin", value: "admin" },
          { label: "User", value: "user" },
          { label: "Viewer", value: "viewer" },
        ],
  }), [roles]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(["all"]);
  const [roleFilter, setRoleFilter] = useState<string[]>(["all"]);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [selected, setSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [formRole, setFormRole] = useState<string[]>(["user"]);
  const [formStatus, setFormStatus] = useState<string[]>(["active"]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let list = [...users];
    const sf = statusFilter[0];
    const rf = roleFilter[0];
    if (sf && sf !== "all") list = list.filter((u) => u.status === sf);
    if (rf && rf !== "all") list = list.filter((u) => u.role === rf);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av: string, bv: string;
      if (sort.key === "name") { av = `${a.firstName} ${a.lastName}`; bv = `${b.firstName} ${b.lastName}`; }
      else if (sort.key === "email") { av = a.email; bv = b.email; }
      else if (sort.key === "role") { av = a.role; bv = b.role; }
      else if (sort.key === "status") { av = a.status; bv = b.status; }
      else { av = a.createdAt; bv = b.createdAt; }
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [users, search, statusFilter, roleFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: SortKey) => {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
    setPage(1);
  };

  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormRole(["user"]);
    setFormStatus(["active"]);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, password: "", role: user.role, status: user.status, phone: user.phone || "", department: user.department || "" });
    setFormRole([user.role]);
    setFormStatus([user.status]);
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = "Required";
    if (!form.lastName.trim()) errs.lastName = "Required";
    if (!form.email.trim()) errs.email = "Required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";
    if (!editingUser && !form.password) errs.password = "Required for new user";
    else if (!editingUser && form.password.length < 8) errs.password = "Min 8 characters";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setFormLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const role = (formRole[0] || "user") as UserRole;
    const status = (formStatus[0] || "active") as UserStatus;
    try {
      if (editingUser) {
        const updates: Partial<User> = { firstName: form.firstName, lastName: form.lastName, email: form.email, role, status, phone: form.phone, department: form.department };
        if (form.password) updates.password = form.password;
        await updateUser(editingUser.id, updates);
        toaster.create({ title: "User updated successfully", type: "success" });
      } else {
        await addUser({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, role, status, phone: form.phone, department: form.department, twoFactorEnabled: false, favoriteApps: [], sessionCount: 0, notificationsEnabled: true, emailNotifications: true, theme: "dark", language: "en", timezone: "America/New_York" });
        toaster.create({ title: "User created successfully", type: "success" });
      }
      setFormLoading(false);
      setShowModal(false);
    } catch (err: any) {
      toaster.create({ title: err.message || "Failed to save user", type: "error" });
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await new Promise((r) => setTimeout(r, 500));
    await deleteUser(deleteTarget);
    setDeleteTarget(null);
    toaster.create({ title: "User deleted", type: "success" });
  };

  const handleBulkDelete = async () => {
    await new Promise((r) => setTimeout(r, 600));
    await bulkDeleteUsers(selected);
    setSelected([]);
    setBulkDeleteOpen(false);
    toaster.create({ title: `${selected.length} users deleted`, type: "success" });
  };

  const allChecked = paginated.length > 0 && paginated.every((u) => selected.includes(u.id));
  const someChecked = paginated.some((u) => selected.includes(u.id));

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key === k ? (sort.dir === "asc" ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />) : null;

  const statusColor = (s: string) => s === "active" ? "green" : s === "inactive" ? "gray" : "red";
  const roleColor = (r: string) => r === "super_admin" ? "purple" : r === "admin" ? "blue" : r === "viewer" ? "orange" : "gray";

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1400px" mx="auto">
      <HStack justifyContent="space-between" mb="6" flexWrap="wrap" gap="4">
        <VStack alignItems="start" gap="1">
          <Heading size="xl" fontWeight="bold">User Management</Heading>
          <Text color="fg.muted">{users.length} total users</Text>
        </VStack>
        <Button colorPalette="blue" onClick={openAdd}>
          <LuPlus size={16} /> Add User
        </Button>
      </HStack>

      {/* Filters */}
      <HStack gap="3" mb="4" flexWrap="wrap">
        <Box position="relative" flex="1" minW="200px">
          <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" pointerEvents="none" color="fg.muted">
            <LuSearch size={16} />
          </Box>
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            pl="9"
            size="sm"
          />
        </Box>
        <SelectRoot collection={statusOptions} value={statusFilter} onValueChange={(d) => { setStatusFilter(d.value); setPage(1); }} size="sm" w="150px">
          <SelectTrigger><SelectValueText placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {statusOptions.items.map((i) => <SelectItem key={i.value} item={i}>{i.label}</SelectItem>)}
          </SelectContent>
        </SelectRoot>
        <SelectRoot collection={roleFilterOptions} value={roleFilter} onValueChange={(d) => { setRoleFilter(d.value); setPage(1); }} size="sm" w="150px">
          <SelectTrigger><SelectValueText placeholder="Role" /></SelectTrigger>
          <SelectContent>
            {roleFilterOptions.items.map((i) => <SelectItem key={i.value} item={i}>{i.label}</SelectItem>)}
          </SelectContent>
        </SelectRoot>
      </HStack>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <HStack gap="2" mb="3" p="3" bg="blue.950" borderRadius="lg" flexWrap="wrap">
          <Text fontSize="sm" fontWeight="medium">{selected.length} selected</Text>
          <Button size="xs" colorPalette="orange" variant="outline" onClick={async () => { await bulkDeactivateUsers(selected); setSelected([]); toaster.create({ title: "Users deactivated", type: "success" }); }}>Deactivate</Button>
          <Button size="xs" colorPalette="blue" variant="outline" onClick={async () => { await bulkUpdateRole(selected, "viewer"); setSelected([]); toaster.create({ title: "Roles updated to Viewer", type: "success" }); }}>Set Viewer</Button>
          <Button size="xs" colorPalette="red" variant="outline" onClick={() => setBulkDeleteOpen(true)}>Delete Selected</Button>
          <Button size="xs" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
        </HStack>
      )}

      {/* Table */}
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" overflow="hidden">
        <Box overflowX="auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--chakra-colors-bg-subtle)" }}>
                <th style={{ padding: "10px 16px", width: "40px" }}>
                  <Checkbox
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={(d) => {
                      if (d.checked) setSelected((prev) => [...new Set([...prev, ...paginated.map((u) => u.id)])]);
                      else setSelected((prev) => prev.filter((id) => !paginated.find((u) => u.id === id)));
                    }}
                  />
                </th>
                {([["name", "Name"], ["email", "Email"], ["role", "Role"], ["status", "Status"], ["createdAt", "Joined"]] as [SortKey, string][]).map(([k, label]) => (
                  <th key={k} style={{ padding: "10px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--chakra-colors-fg-muted)", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => toggleSort(k)}>
                    <HStack gap="1" display="inline-flex">{label}<SortIcon k={k} /></HStack>
                  </th>
                ))}
                <th style={{ padding: "10px 16px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--chakra-colors-fg-muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "var(--chakra-colors-fg-muted)" }}>No users found</td></tr>
              ) : paginated.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--chakra-colors-border)", background: selected.includes(u.id) ? "var(--chakra-colors-blue-50)" : undefined }}>
                  <td style={{ padding: "12px 16px" }}>
                    <Checkbox
                      checked={selected.includes(u.id)}
                      onCheckedChange={(d) => setSelected((prev) => d.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id))}
                    />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <HStack gap="3">
                      <Avatar size="sm" name={`${u.firstName} ${u.lastName}`} src={u.avatar} />
                      <VStack gap="0" alignItems="start">
                        <Text fontSize="sm" fontWeight="medium">{u.firstName} {u.lastName}</Text>
                        <Text fontSize="xs" color="var(--chakra-colors-fg-muted)">{u.department || "—"}</Text>
                      </VStack>
                    </HStack>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "14px" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge colorPalette={roleColor(u.role)} size="sm">{u.role.replace("_", " ")}</Badge>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge colorPalette={statusColor(u.status)} size="sm">{u.status}</Badge>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--chakra-colors-fg-muted)", whiteSpace: "nowrap" }}>
                    {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <HStack gap="1" justifyContent="end">
                      <Button variant="ghost" size="xs" px="2" onClick={() => openEdit(u)} aria-label="Edit user"><LuPencil size={14} /></Button>
                      <Button variant="ghost" size="xs" px="2" colorPalette="red" onClick={() => setDeleteTarget(u.id)} aria-label="Delete user" disabled={u.id === auth.user?.id}><LuTrash2 size={14} /></Button>
                    </HStack>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        {/* Pagination */}
        <HStack p="4" borderTopWidth="1px" borderColor="border" justifyContent="space-between" flexWrap="wrap" gap="2">
          <Text fontSize="sm" color="fg.muted">
            {filtered.length === 0 ? "0 results" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} of ${filtered.length} users`}
          </Text>
          <HStack gap="2">
            <Button size="xs" variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Prev</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button key={p} size="xs" variant={page === p ? "solid" : "outline"} colorPalette={page === p ? "blue" : "gray"} onClick={() => setPage(p)}>{p}</Button>
            ))}
            <Button size="xs" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>Next</Button>
          </HStack>
        </HStack>
      </Box>

      {/* Add/Edit Modal */}
      <DialogRoot open={showModal} onOpenChange={(d) => setShowModal(d.open)} size="lg">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <DialogBody>
              <VStack gap="4">
                <SimpleGrid columns={2} gap="4" w="full">
                  <Field label="First Name" invalid={!!formErrors.firstName} errorText={formErrors.firstName}>
                    <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                  </Field>
                  <Field label="Last Name" invalid={!!formErrors.lastName} errorText={formErrors.lastName}>
                    <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                  </Field>
                </SimpleGrid>
                <Field label="Email" invalid={!!formErrors.email} errorText={formErrors.email} w="full">
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </Field>
                <Field label={editingUser ? "New Password (leave blank to keep)" : "Password"} invalid={!!formErrors.password} errorText={formErrors.password} w="full">
                  <PasswordInput value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editingUser ? "Leave blank to keep current" : "Min 8 characters"} />
                </Field>
                <SimpleGrid columns={2} gap="4" w="full">
                  <Field label="Role">
                    <SelectRoot collection={roleOptions} value={formRole} onValueChange={(d) => setFormRole(d.value)} w="full">
                      <SelectTrigger><SelectValueText /></SelectTrigger>
                      <SelectContent>
                        {roleOptions.items.map((i) => <SelectItem key={i.value} item={i}>{i.label}</SelectItem>)}
                      </SelectContent>
                    </SelectRoot>
                  </Field>
                  <Field label="Status">
                    <SelectRoot collection={createListCollection({ items: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Suspended", value: "suspended" }] })} value={formStatus} onValueChange={(d) => setFormStatus(d.value)} w="full">
                      <SelectTrigger><SelectValueText /></SelectTrigger>
                      <SelectContent>
                        {[{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Suspended", value: "suspended" }].map((i) => <SelectItem key={i.value} item={i}>{i.label}</SelectItem>)}
                      </SelectContent>
                    </SelectRoot>
                  </Field>
                </SimpleGrid>
                <SimpleGrid columns={2} gap="4" w="full">
                  <Field label="Phone">
                    <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
                  </Field>
                  <Field label="Department">
                    <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="Engineering" />
                  </Field>
                </SimpleGrid>
              </VStack>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" colorPalette="blue" loading={formLoading} loadingText="Saving...">
                {editingUser ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* Delete Confirmation */}
      <DialogRoot open={!!deleteTarget} onOpenChange={(d) => !d.open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <DialogBody>
            <Text>Are you sure you want to delete this user? This action cannot be undone.</Text>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button colorPalette="red" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* Bulk Delete Confirmation */}
      <DialogRoot open={bulkDeleteOpen} onOpenChange={(d) => setBulkDeleteOpen(d.open)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {selected.length} Users</DialogTitle></DialogHeader>
          <DialogBody>
            <Text>Are you sure you want to delete {selected.length} selected users? This action cannot be undone.</Text>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button colorPalette="red" onClick={handleBulkDelete}>Delete All</Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}
