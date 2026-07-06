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
  Separator,
  Switch,
  Textarea,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import {
  DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogCloseTrigger,
} from "@/components/ui/dialog";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import type { Role, PermissionMatrix } from "@/store/types";
import { LuPlus, LuPencil, LuTrash2, LuShield } from "react-icons/lu";

const RESOURCES = ["users", "roles", "applications", "reports", "settings", "audit_logs"] as const;
const PERMISSIONS = ["create", "read", "update", "delete"] as const;

function countPermissions(matrix: PermissionMatrix): number {
  return Object.values(matrix).reduce((sum, r) => sum + Object.values(r).filter(Boolean).length, 0);
}

const emptyMatrix = (): PermissionMatrix =>
  Object.fromEntries(RESOURCES.map((r) => [r, { create: false, read: false, update: false, delete: false }]));

export default function AdminRolesPage() {
  const { roles, users, addRole, updateRole, deleteRole } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const [matrix, setMatrix] = useState<PermissionMatrix>(emptyMatrix());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roleUserCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return counts;
  }, [users]);

  const openAdd = () => {
    setEditingRole(null);
    setName("");
    setDescription("");
    setColor("blue");
    setMatrix(emptyMatrix());
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description);
    setColor(role.color);
    setMatrix(JSON.parse(JSON.stringify(role.permissions)));
    setErrors({});
    setShowModal(true);
  };

  const togglePerm = (resource: string, perm: string) => {
    setMatrix((m) => ({
      ...m,
      [resource]: { ...m[resource], [perm]: !m[resource][perm] },
    }));
  };

  const setAllForResource = (resource: string, value: boolean) => {
    setMatrix((m) => ({
      ...m,
      [resource]: { create: value, read: value, update: value, delete: value },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Role name is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    if (editingRole) {
      updateRole(editingRole.id, { name, description, color, permissions: matrix });
      toaster.create({ title: "Role updated", type: "success" });
    } else {
      addRole({ name, description, color, permissions: matrix });
      toaster.create({ title: "Role created", type: "success" });
    }
    setLoading(false);
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const role = roles.find((r) => r.id === deleteTarget);
    const roleUserCount = roleUserCounts[role?.name?.toLowerCase() || ""] || 0;
    await new Promise((r) => setTimeout(r, 500));
    deleteRole(deleteTarget);
    setDeleteTarget(null);
    toaster.create({ title: "Role deleted", type: "success" });
  };

  const colorOptions = ["blue", "purple", "teal", "green", "orange", "red", "gray", "pink"];

  const deleteRole_ = roles.find((r) => r.id === deleteTarget);
  const deleteRoleUserCount = deleteRole_ ? (roleUserCounts[deleteRole_.name.toLowerCase().replace(" ", "_")] || deleteRole_.userCount) : 0;

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1400px" mx="auto">
      <HStack justifyContent="space-between" mb="6" flexWrap="wrap" gap="4">
        <VStack alignItems="start" gap="1">
          <Heading size="xl" fontWeight="bold">Role Management</Heading>
          <Text color="fg.muted">{roles.length} roles configured</Text>
        </VStack>
        <Button colorPalette="blue" onClick={openAdd}>
          <LuPlus size={16} /> Create Role
        </Button>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4">
        {roles.map((role) => {
          const permCount = countPermissions(role.permissions);
          const userCount = roleUserCounts[role.name.toLowerCase().replace(/ /g, "_")] ?? role.userCount;
          return (
            <Box key={role.id} bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="5" _hover={{ shadow: "md" }} transition="shadow 0.15s">
              <HStack justifyContent="space-between" mb="3">
                <HStack gap="2">
                  <Box
                    w="10"
                    h="10"
                    bg={`${role.color}.50`}
                    _dark={{ bg: `${role.color}.950` }}
                    borderRadius="lg"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <LuShield size={20} color={`var(--chakra-colors-${role.color}-500)`} />
                  </Box>
                  <VStack gap="0" alignItems="start">
                    <Text fontWeight="bold">{role.name}</Text>
                    <Badge colorPalette={role.color} size="xs">{userCount} users</Badge>
                  </VStack>
                </HStack>
                <HStack gap="1">
                  <Button variant="ghost" size="xs" px="2" onClick={() => openEdit(role)}><LuPencil size={14} /></Button>
                  <Button variant="ghost" size="xs" px="2" colorPalette="red" onClick={() => setDeleteTarget(role.id)}><LuTrash2 size={14} /></Button>
                </HStack>
              </HStack>

              <Text fontSize="sm" color="fg.muted" mb="3" lineClamp={2}>{role.description}</Text>

              <HStack justifyContent="space-between">
                <Badge colorPalette="gray" size="sm">{permCount} permissions</Badge>
                <Text fontSize="xs" color="fg.subtle">
                  {Object.keys(role.permissions).length} resources
                </Text>
              </HStack>

              {/* Permission preview */}
              <Box mt="3" pt="3" borderTopWidth="1px" borderColor="border">
                <VStack gap="1.5">
                  {RESOURCES.slice(0, 3).map((resource) => {
                    const perms = role.permissions[resource] || {};
                    const grantedPerms = Object.entries(perms).filter(([, v]) => v).map(([k]) => k);
                    return (
                      <HStack key={resource} justifyContent="space-between" w="full">
                        <Text fontSize="xs" textTransform="capitalize" color="fg.muted" w="20">{resource}</Text>
                        <HStack gap="1">
                          {PERMISSIONS.map((p) => (
                            <Box
                              key={p}
                              w="5"
                              h="5"
                              borderRadius="sm"
                              bg={perms[p] ? `${role.color}.100` : "bg.muted"}
                              _dark={{ bg: perms[p] ? `${role.color}.900` : "bg.muted" }}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              title={p}
                            >
                              <Text fontSize="2xs" color={perms[p] ? `${role.color}.700` : "fg.subtle"} fontWeight="bold">
                                {p[0].toUpperCase()}
                              </Text>
                            </Box>
                          ))}
                        </HStack>
                      </HStack>
                    );
                  })}
                </VStack>
              </Box>
            </Box>
          );
        })}
      </SimpleGrid>

      {/* Create/Edit Modal */}
      <DialogRoot open={showModal} onOpenChange={(d) => setShowModal(d.open)} size="xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <DialogBody>
              <VStack gap="5">
                <SimpleGrid columns={2} gap="4" w="full">
                  <Field label="Role Name" invalid={!!errors.name} errorText={errors.name}>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Manager" />
                  </Field>
                  <Field label="Color">
                    <HStack gap="2" flexWrap="wrap">
                      {colorOptions.map((c) => (
                        <Box
                          key={c}
                          w="6"
                          h="6"
                          borderRadius="md"
                          bg={`${c}.500`}
                          cursor="pointer"
                          borderWidth={color === c ? "2px" : "0"}
                          borderColor="fg"
                          onClick={() => setColor(c)}
                        />
                      ))}
                    </HStack>
                  </Field>
                </SimpleGrid>

                <Field label="Description" w="full">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this role's purpose..."
                    rows={2}
                  />
                </Field>

                <Box w="full">
                  <Text fontWeight="semibold" mb="3" fontSize="sm">Permission Matrix</Text>
                  <Box borderRadius="lg" borderWidth="1px" borderColor="border" overflow="hidden">
                    <HStack
                      bg="bg.subtle"
                      px="4"
                      py="2"
                      borderBottomWidth="1px"
                      borderColor="border"
                    >
                      <Text fontSize="xs" fontWeight="semibold" color="fg.muted" flex="1">Resource</Text>
                      {PERMISSIONS.map((p) => (
                        <Text key={p} fontSize="xs" fontWeight="semibold" color="fg.muted" w="16" textAlign="center" textTransform="capitalize">{p}</Text>
                      ))}
                      <Text fontSize="xs" fontWeight="semibold" color="fg.muted" w="14" textAlign="center">All</Text>
                    </HStack>
                    {RESOURCES.map((resource) => {
                      const allGranted = PERMISSIONS.every((p) => matrix[resource]?.[p]);
                      return (
                        <HStack
                          key={resource}
                          px="4"
                          py="2.5"
                          borderTopWidth="1px"
                          borderColor="border"
                        >
                          <Text fontSize="sm" textTransform="capitalize" flex="1" fontWeight="medium">
                            {resource.replace("_", " ")}
                          </Text>
                          {PERMISSIONS.map((perm) => (
                            <Box key={perm} w="16" display="flex" justifyContent="center">
                              <Switch.Root
                                size="sm"
                                checked={matrix[resource]?.[perm] || false}
                                onCheckedChange={() => togglePerm(resource, perm)}
                                colorPalette="blue"
                              >
                                <Switch.HiddenInput />
                                <Switch.Control>
                                  <Switch.Thumb />
                                </Switch.Control>
                              </Switch.Root>
                            </Box>
                          ))}
                          <Box w="14" display="flex" justifyContent="center">
                            <Switch.Root
                              size="sm"
                              checked={allGranted}
                              onCheckedChange={(d) => setAllForResource(resource, !!d.checked)}
                              colorPalette="purple"
                            >
                              <Switch.HiddenInput />
                              <Switch.Control>
                                <Switch.Thumb />
                              </Switch.Control>
                            </Switch.Root>
                          </Box>
                        </HStack>
                      );
                    })}
                  </Box>
                  <Text fontSize="xs" color="fg.muted" mt="2">
                    Total: {countPermissions(matrix)} permissions enabled
                  </Text>
                </Box>
              </VStack>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" colorPalette="blue" loading={loading} loadingText="Saving...">
                {editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* Delete Confirmation */}
      <DialogRoot open={!!deleteTarget} onOpenChange={(d) => !d.open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Role</DialogTitle></DialogHeader>
          <DialogBody>
            <VStack gap="3" alignItems="start">
              <Text>Are you sure you want to delete the <strong>{deleteRole_?.name}</strong> role?</Text>
              {deleteRoleUserCount > 0 && (
                <Box p="3" bg="orange.50" _dark={{ bg: "orange.950" }} borderRadius="lg" borderWidth="1px" borderColor="orange.200" w="full">
                  <Text fontSize="sm" color="orange.700" _dark={{ color: "orange.300" }}>
                    ⚠️ Warning: {deleteRoleUserCount} user(s) are currently assigned to this role. They will need to be reassigned.
                  </Text>
                </Box>
              )}
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button colorPalette="red" onClick={handleDelete}>Delete Role</Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}
