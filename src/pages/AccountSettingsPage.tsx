import { useState } from "react";
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
  Separator,
  Tabs,
  Switch,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Avatar } from "@/components/ui/avatar";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import {
  LuUser,
  LuSettings2,
  LuShield,
  LuSmartphone,
  LuMonitor,
  LuBell,
  LuCircleCheck,
  LuCircleAlert,
} from "react-icons/lu";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createListCollection } from "@chakra-ui/react";
import { formatDistanceToNow } from "date-fns";

export default function AccountSettingsPage() {
  const { auth, updateUser, sessions, terminateSession, terminateAllOtherSessions } = useStore();
  const user = auth.user!;

  const [activeTab, setActiveTab] = useState("profile");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [prefLoading, setPrefLoading] = useState(false);

  // Profile form
  const [profile, setProfile] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || "",
    department: user.department || "",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Password form
  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(user.twoFactorEnabled);
  const [twoFAToggling, setTwoFAToggling] = useState(false);

  // Preferences (theme fixed to dark)
  const [language, setLanguage] = useState<string[]>([user.language]);
  const [timezone, setTimezone] = useState<string[]>([user.timezone]);
  const [notifications, setNotifications] = useState(user.notificationsEnabled);
  const [emailNotifications, setEmailNotifications] = useState(user.emailNotifications);

  const languageCollection = createListCollection({
    items: [
      { label: "English", value: "en" },
      { label: "Spanish", value: "es" },
      { label: "French", value: "fr" },
      { label: "German", value: "de" },
    ],
  });

  const timezoneCollection = createListCollection({
    items: [
      { label: "America/New_York (EST)", value: "America/New_York" },
      { label: "America/Chicago (CST)", value: "America/Chicago" },
      { label: "America/Los_Angeles (PST)", value: "America/Los_Angeles" },
      { label: "Europe/London (GMT)", value: "Europe/London" },
      { label: "Europe/Paris (CET)", value: "Europe/Paris" },
      { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
    ],
  });

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!profile.firstName.trim()) errs.firstName = "First name is required";
    if (!profile.lastName.trim()) errs.lastName = "Last name is required";
    if (!profile.email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(profile.email)) errs.email = "Enter a valid email";
    setProfileErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setProfileLoading(true);
    await updateUser(user.id, profile);
    setProfileLoading(false);
    toaster.create({ title: "Profile updated successfully", type: "success" });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!passwords.current) errs.current = "Current password is required";
    else if (passwords.current !== user.password) errs.current = "Current password is incorrect";
    if (!passwords.newPass) errs.newPass = "New password is required";
    else if (passwords.newPass.length < 8) errs.newPass = "Must be at least 8 characters";
    else if (!/[A-Z]/.test(passwords.newPass)) errs.newPass = "Must contain an uppercase letter";
    else if (!/[0-9]/.test(passwords.newPass)) errs.newPass = "Must contain a number";
    if (passwords.newPass !== passwords.confirm) errs.confirm = "Passwords do not match";
    setPasswordErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPasswordLoading(true);
    await updateUser(user.id, { password: passwords.newPass });
    setPasswordLoading(false);
    setPasswords({ current: "", newPass: "", confirm: "" });
    toaster.create({ title: "Password changed successfully", type: "success" });
  };

  const handleToggle2FA = async () => {
    setTwoFAToggling(true);
    await new Promise((r) => setTimeout(r, 800));
    const next = !twoFAEnabled;
    setTwoFAEnabled(next);
    await updateUser(user.id, { twoFactorEnabled: next });
    setTwoFAToggling(false);
    toaster.create({
      title: next ? "2FA Enabled" : "2FA Disabled",
      description: next ? "Your account is now more secure" : "2FA has been disabled for your account",
      type: next ? "success" : "warning",
    });
  };

  const handlePrefSave = async () => {
    setPrefLoading(true);
    await updateUser(user.id, {
      language: language[0] || "en",
      timezone: timezone[0] || "America/New_York",
      notificationsEnabled: notifications,
      emailNotifications,
    });
    setPrefLoading(false);
    toaster.create({ title: "Preferences saved", type: "success" });
  };

  const userSessions = sessions.filter((s) => s.userId === user.id);

  return (
    <Box p={{ base: "4", md: "6", lg: "8" }} maxW="900px" mx="auto">
      <Heading size="xl" fontWeight="bold" mb="6">Account Settings</Heading>

      <Tabs.Root value={activeTab} onValueChange={(d) => setActiveTab(d.value)}>
        <Tabs.List mb="6" flexWrap="wrap">
          <Tabs.Trigger value="profile">
            <HStack gap="2"><LuUser size={14} /><span>Profile</span></HStack>
          </Tabs.Trigger>
          <Tabs.Trigger value="preferences">
            <HStack gap="2"><LuSettings2 size={14} /><span>Preferences</span></HStack>
          </Tabs.Trigger>
          <Tabs.Trigger value="security">
            <HStack gap="2"><LuShield size={14} /><span>Security</span></HStack>
          </Tabs.Trigger>
          <Tabs.Trigger value="2fa">
            <HStack gap="2"><LuSmartphone size={14} /><span>2FA</span></HStack>
          </Tabs.Trigger>
          <Tabs.Trigger value="sessions">
            <HStack gap="2"><LuMonitor size={14} /><span>Sessions</span></HStack>
          </Tabs.Trigger>
          <Tabs.Trigger value="notifications">
            <HStack gap="2"><LuBell size={14} /><span>Notifications</span></HStack>
          </Tabs.Trigger>
        </Tabs.List>

        {/* Profile Tab */}
        <Tabs.Content value="profile">
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="6">
            <HStack gap="5" mb="6" flexWrap="wrap">
              <Avatar size="xl" name={`${user.firstName} ${user.lastName}`} src={user.avatar} />
              <VStack alignItems="start" gap="1">
                <Text fontWeight="semibold">{user.firstName} {user.lastName}</Text>
                <Badge colorPalette={user.role === "super_admin" ? "purple" : user.role === "admin" ? "blue" : "gray"}>
                  {user.role.replace("_", " ")}
                </Badge>
                <Text fontSize="sm" color="fg.muted">Member since {new Date(user.createdAt).toLocaleDateString()}</Text>
              </VStack>
            </HStack>

            <form onSubmit={handleProfileSave}>
              <VStack gap="5">
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4" w="full">
                  <Field label="First Name" invalid={!!profileErrors.firstName} errorText={profileErrors.firstName}>
                    <Input
                      value={profile.firstName}
                      onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    />
                  </Field>
                  <Field label="Last Name" invalid={!!profileErrors.lastName} errorText={profileErrors.lastName}>
                    <Input
                      value={profile.lastName}
                      onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    />
                  </Field>
                </SimpleGrid>

                <Field label="Email Address" invalid={!!profileErrors.email} errorText={profileErrors.email} w="full">
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  />
                </Field>

                <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4" w="full">
                  <Field label="Phone">
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                    />
                  </Field>
                  <Field label="Department">
                    <Input
                      value={profile.department}
                      onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
                      placeholder="Engineering"
                    />
                  </Field>
                </SimpleGrid>

                <HStack justifyContent="end" w="full">
                  <Button type="submit" colorPalette="blue" loading={profileLoading} loadingText="Saving...">
                    Save Changes
                  </Button>
                </HStack>
              </VStack>
            </form>
          </Box>
        </Tabs.Content>

        {/* Preferences Tab */}
        <Tabs.Content value="preferences">
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="6">
            <Heading size="md" mb="5">Display Preferences</Heading>
            <VStack gap="5">
              <Field label="Theme" w="full">
                <Input value="Dark" disabled bg="bg.muted" />
                <Text fontSize="xs" color="fg.muted" mt="1">Theme is fixed to dark mode</Text>
              </Field>

              <Field label="Language" w="full">
                <SelectRoot collection={languageCollection} value={language} onValueChange={(d) => setLanguage(d.value)} w="full">
                  <SelectTrigger>
                    <SelectValueText placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageCollection.items.map((item) => (
                      <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Field>

              <Field label="Timezone" w="full">
                <SelectRoot collection={timezoneCollection} value={timezone} onValueChange={(d) => setTimezone(d.value)} w="full">
                  <SelectTrigger>
                    <SelectValueText placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneCollection.items.map((item) => (
                      <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Field>

              <HStack justifyContent="end" w="full">
                <Button colorPalette="blue" onClick={handlePrefSave} loading={prefLoading} loadingText="Saving...">
                  Save Preferences
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Tabs.Content>

        {/* Security Tab */}
        <Tabs.Content value="security">
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="6">
            <Heading size="md" mb="5">Change Password</Heading>
            <form onSubmit={handlePasswordChange}>
              <VStack gap="4" maxW="sm">
                <Field label="Current Password" invalid={!!passwordErrors.current} errorText={passwordErrors.current} w="full">
                  <PasswordInput
                    placeholder="Enter current password"
                    value={passwords.current}
                    onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                  />
                </Field>
                <Field label="New Password" invalid={!!passwordErrors.newPass} errorText={passwordErrors.newPass} w="full">
                  <PasswordInput
                    placeholder="Enter new password"
                    value={passwords.newPass}
                    onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
                  />
                </Field>
                <Field label="Confirm New Password" invalid={!!passwordErrors.confirm} errorText={passwordErrors.confirm} w="full">
                  <PasswordInput
                    placeholder="Confirm new password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                  />
                </Field>
                <Button type="submit" colorPalette="blue" loading={passwordLoading} loadingText="Updating...">
                  Update Password
                </Button>
              </VStack>
            </form>
          </Box>
        </Tabs.Content>

        {/* 2FA Tab */}
        <Tabs.Content value="2fa">
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="6">
            <VStack gap="5" alignItems="start">
              <HStack gap="3" justifyContent="space-between" w="full">
                <VStack alignItems="start" gap="1">
                  <Heading size="md">Two-Factor Authentication</Heading>
                  <Text fontSize="sm" color="fg.muted">
                    Add an extra layer of security to your account
                  </Text>
                </VStack>
                <Badge colorPalette={twoFAEnabled ? "green" : "orange"} size="lg">
                  {twoFAEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </HStack>

              <Separator />

              <Box
                p="4"
                bg={twoFAEnabled ? "green.950" : "orange.950"}
                borderRadius="lg"
                w="full"
              >
                <HStack gap="3">
                  {twoFAEnabled ? (
                    <LuCircleCheck size={20} color="var(--chakra-colors-green-400)" />
                  ) : (
                    <LuCircleAlert size={20} color="var(--chakra-colors-orange-400)" />
                  )}
                  <VStack alignItems="start" gap="0.5">
                    <Text fontWeight="semibold" fontSize="sm">
                      {twoFAEnabled ? "Your account is protected with 2FA" : "Your account is not fully protected"}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {twoFAEnabled
                        ? "You will be required to enter a verification code when signing in"
                        : "Enable 2FA to require a verification code at each sign in"}
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              <Text fontSize="sm" color="fg.muted">
                When enabled, you'll be asked to enter a 6-digit code from your authenticator app or email on each login.
                The demo code is <strong>123456</strong>.
              </Text>

              <Button
                colorPalette={twoFAEnabled ? "red" : "green"}
                onClick={handleToggle2FA}
                loading={twoFAToggling}
                loadingText={twoFAEnabled ? "Disabling..." : "Enabling..."}
              >
                {twoFAEnabled ? "Disable 2FA" : "Enable 2FA"}
              </Button>
            </VStack>
          </Box>
        </Tabs.Content>

        {/* Sessions Tab */}
        <Tabs.Content value="sessions">
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="6">
            <HStack justifyContent="space-between" mb="5">
              <Heading size="md">Active Sessions</Heading>
              <Button
                colorPalette="red"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await terminateAllOtherSessions();
                  toaster.create({ title: "All other sessions terminated", type: "success" });
                }}
                disabled={userSessions.filter((s) => !s.isCurrent).length === 0}
              >
                Terminate All Others
              </Button>
            </HStack>

            <VStack gap="3" alignItems="stretch">
              {userSessions.length === 0 ? (
                <Text color="fg.muted" fontSize="sm">No active sessions found.</Text>
              ) : (
                userSessions.map((sess) => (
                  <HStack
                    key={sess.id}
                    p="4"
                    bg="bg.subtle"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border"
                    gap="4"
                    flexWrap="wrap"
                  >
                    <Box w="10" h="10" bg="blue.950" borderRadius="lg" display="flex" alignItems="center" justifyContent="center" flexShrink="0">
                      <LuMonitor size={18} color="var(--chakra-colors-blue-400)" />
                    </Box>
                    <VStack alignItems="start" gap="0.5" flex="1" minW="0">
                      <HStack gap="2">
                        <Text fontWeight="semibold" fontSize="sm">{sess.browser} on {sess.os}</Text>
                        {sess.isCurrent && <Badge colorPalette="green" size="xs">Current</Badge>}
                      </HStack>
                      <Text fontSize="xs" color="fg.muted">{sess.ip} · {sess.location}</Text>
                      <Text fontSize="xs" color="fg.subtle">
                        Last active {formatDistanceToNow(new Date(sess.lastActive), { addSuffix: true })}
                      </Text>
                    </VStack>
                    {!sess.isCurrent && (
                      <Button
                        colorPalette="red"
                        variant="outline"
                        size="xs"
                        onClick={async () => {
                          await terminateSession(sess.id);
                          toaster.create({ title: "Session terminated", type: "success" });
                        }}
                      >
                        Terminate
                      </Button>
                    )}
                  </HStack>
                ))
              )}
            </VStack>
          </Box>
        </Tabs.Content>

        {/* Notifications Tab */}
        <Tabs.Content value="notifications">
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p="6">
            <Heading size="md" mb="5">Notification Settings</Heading>
            <VStack gap="4" alignItems="stretch">
              {[
                {
                  label: "Push Notifications",
                  desc: "Receive in-app alerts and notifications",
                  value: notifications,
                  onChange: setNotifications,
                },
                {
                  label: "Email Notifications",
                  desc: "Get important updates via email",
                  value: emailNotifications,
                  onChange: setEmailNotifications,
                },
              ].map((n) => (
                <HStack
                  key={n.label}
                  p="4"
                  bg="bg.subtle"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="border"
                  justifyContent="space-between"
                >
                  <VStack alignItems="start" gap="0.5">
                    <Text fontWeight="semibold" fontSize="sm">{n.label}</Text>
                    <Text fontSize="xs" color="fg.muted">{n.desc}</Text>
                  </VStack>
                  <Switch.Root
                    checked={n.value}
                    onCheckedChange={(d) => n.onChange(d.checked)}
                    colorPalette="blue"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </HStack>
              ))}

              <HStack justifyContent="end">
                <Button
                  colorPalette="blue"
                  onClick={async () => {
                    setPrefLoading(true);
                    await updateUser(user.id, { notificationsEnabled: notifications, emailNotifications });
                    setPrefLoading(false);
                    toaster.create({ title: "Notification preferences saved", type: "success" });
                  }}
                  loading={prefLoading}
                  loadingText="Saving..."
                >
                  Save Preferences
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}
