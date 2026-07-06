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
  Textarea,
  Switch,
  SimpleGrid,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import {
  DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogCloseTrigger,
} from "@/components/ui/dialog";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import type { EmailTemplate } from "@/store/types";
import { LuPencil, LuEye, LuMail } from "react-icons/lu";
import { formatDistanceToNow } from "date-fns";

const PREVIEW_VARS: Record<string, string> = {};


function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

const typeColor: Record<string, string> = {
  welcome: "green",
  password_reset: "orange",
  email_verification: "blue",
  "2fa_code": "purple",
  login_alert: "yellow",
  account_locked: "red",
};

export default function AdminEmailPage() {
  const { emailTemplates, updateEmailTemplate } = useStore();

  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [enabled, setEnabled] = useState(true);

  const openEdit = (tpl: EmailTemplate) => {
    setEditingTemplate(tpl);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setEnabled(tpl.enabled);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    updateEmailTemplate(editingTemplate.id, { subject, body, enabled });
    setLoading(false);
    setEditingTemplate(null);
    toaster.create({ title: `Template "${editingTemplate.name}" saved`, type: "success" });
  };

  const handleToggleEnabled = (id: string, val: boolean) => {
    updateEmailTemplate(id, { enabled: val });
    toaster.create({ title: `Template ${val ? "enabled" : "disabled"}`, type: "info" });
  };

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="1100px" mx="auto">
      <VStack alignItems="start" gap="1" mb="6">
        <Heading size="xl" fontWeight="bold">Email Notifications</Heading>
        <Text color="fg.muted">Manage notification email templates</Text>
      </VStack>

      <VStack gap="4" alignItems="stretch">
        {emailTemplates.map((tpl) => (
          <Box key={tpl.id} bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="5">
            <HStack justifyContent="space-between" flexWrap="wrap" gap="3">
              <HStack gap="3">
                <Box
                  w="10"
                  h="10"
                  bg={`${typeColor[tpl.type] || "gray"}.50`}
                  _dark={{ bg: `${typeColor[tpl.type] || "gray"}.950` }}
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuMail size={18} color={`var(--chakra-colors-${typeColor[tpl.type] || "gray"}-500)`} />
                </Box>
                <VStack gap="0.5" alignItems="start">
                  <HStack gap="2">
                    <Text fontWeight="bold" fontSize="sm">{tpl.name}</Text>
                    <Badge colorPalette={typeColor[tpl.type] || "gray"} size="xs">{tpl.type.replace("_", " ")}</Badge>
                    <Badge colorPalette={tpl.enabled ? "green" : "gray"} size="xs">{tpl.enabled ? "Active" : "Disabled"}</Badge>
                  </HStack>
                  <Text fontSize="xs" color="fg.muted" lineClamp={1}>{tpl.subject}</Text>
                  <Text fontSize="xs" color="fg.subtle">
                    Updated {formatDistanceToNow(new Date(tpl.lastUpdated), { addSuffix: true })}
                  </Text>
                </VStack>
              </HStack>

              <HStack gap="2">
                <Switch.Root
                  checked={tpl.enabled}
                  onCheckedChange={(d) => handleToggleEnabled(tpl.id, d.checked)}
                  colorPalette="green"
                  size="sm"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
                <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(tpl)}>
                  <LuEye size={14} /> Preview
                </Button>
                <Button colorPalette="blue" size="sm" variant="outline" onClick={() => openEdit(tpl)}>
                  <LuPencil size={14} /> Edit
                </Button>
              </HStack>
            </HStack>

            {/* Variables */}
            <HStack gap="1.5" mt="3" flexWrap="wrap">
              <Text fontSize="xs" color="fg.muted">Variables:</Text>
              {tpl.variables.map((v) => (
                <Badge key={v} variant="subtle" colorPalette="gray" size="xs" fontFamily="mono">
                  {`{{${v}}}`}
                </Badge>
              ))}
            </HStack>
          </Box>
        ))}
      </VStack>

      {/* Edit Modal */}
      <DialogRoot open={!!editingTemplate} onOpenChange={(d) => !d.open && setEditingTemplate(null)} size="xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit: {editingTemplate?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <DialogBody>
              <VStack gap="4">
                <Box w="full" p="3" bg="blue.50" _dark={{ bg: "blue.950" }} borderRadius="lg">
                  <Text fontSize="xs" color="fg.muted" mb="1">Available variables:</Text>
                  <HStack gap="1.5" flexWrap="wrap">
                    {editingTemplate?.variables.map((v) => (
                      <Badge key={v} variant="subtle" colorPalette="blue" size="xs" fontFamily="mono" cursor="pointer"
                        onClick={() => setBody((b) => b + ` {{${v}}}`)}
                        title="Click to insert">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </HStack>
                </Box>

                <Field label="Subject Line" w="full">
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject..."
                  />
                </Field>

                <Field label="Email Body" w="full">
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={12}
                    fontFamily="mono"
                    fontSize="sm"
                  />
                </Field>

                <HStack justifyContent="space-between" w="full">
                  <HStack gap="2">
                    <Switch.Root
                      checked={enabled}
                      onCheckedChange={(d) => setEnabled(d.checked)}
                      colorPalette="green"
                    >
                      <Switch.HiddenInput />
                      <Switch.Control><Switch.Thumb /></Switch.Control>
                      <Switch.Label>Enabled</Switch.Label>
                    </Switch.Root>
                  </HStack>
                </HStack>
              </VStack>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
              <Button type="submit" colorPalette="blue" loading={loading} loadingText="Saving...">
                Save Template
              </Button>
            </DialogFooter>
          </form>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* Preview Modal */}
      <DialogRoot open={!!previewTemplate} onOpenChange={(d) => !d.open && setPreviewTemplate(null)} size="xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {previewTemplate && (
              <VStack gap="4" alignItems="stretch">
                <Box p="3" bg="bg.muted" borderRadius="lg">
                  <Text fontSize="xs" color="fg.muted" mb="1">FROM</Text>
                  <Text fontSize="sm">no-reply@example.com</Text>
                </Box>
                <Box p="3" bg="bg.muted" borderRadius="lg">
                  <Text fontSize="xs" color="fg.muted" mb="1">SUBJECT</Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    {interpolate(previewTemplate.subject, PREVIEW_VARS)}
                  </Text>
                </Box>
                <Box
                  p="5"
                  borderWidth="1px"
                  borderColor="border"
                  borderRadius="lg"
                  bg="white"
                  _dark={{ bg: "gray.900" }}
                >
                  <Text fontSize="xs" color="fg.muted" mb="3">EMAIL BODY PREVIEW</Text>
                  <Box
                    as="pre"
                    fontSize="sm"
                    whiteSpace="pre-wrap"
                    fontFamily="body"
                    color="fg"
                  >
                    {interpolate(previewTemplate.body, PREVIEW_VARS)}
                  </Box>
                </Box>
                <Box p="3" bg="blue.50" _dark={{ bg: "blue.950" }} borderRadius="lg">
                  <Text fontSize="xs" color="fg.muted">
                    Preview uses placeholders. Actual values are provided by the runtime when emails are generated.
                  </Text>
                </Box>
              </VStack>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setPreviewTemplate(null)}>Close</Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}
