import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Input,
  Text,
  Heading,
  VStack,
  HStack,
  Flex,
  Badge,
  Progress,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import { LuShield, LuCircleCheck, LuMail, LuRefreshCw } from "react-icons/lu";

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "gray" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: (score / 5) * 100, label: "Very Weak", color: "red" };
  if (score === 2) return { score: (score / 5) * 100, label: "Weak", color: "orange" };
  if (score === 3) return { score: (score / 5) * 100, label: "Fair", color: "yellow" };
  if (score === 4) return { score: (score / 5) * 100, label: "Strong", color: "teal" };
  return { score: 100, label: "Very Strong", color: "green" };
}

export default function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const { forgotPassword, resetPassword } = useStore();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);

  const passwordStrength = getPasswordStrength(newPassword);

  const startResendTimer = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setErrors({ email: "Email is required" }); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setErrors({ email: "Enter a valid email" }); return; }
    setLoading(true);
    setErrors({});
    const result = await forgotPassword(email);
    setLoading(false);
    if (!result.success) {
      setErrors({ email: result.error || "Failed to send reset email" });
      return;
    }
    setStep(1);
    startResendTimer();
    toaster.create({ title: "Reset Code Sent", description: "Use code: 654321 (demo)", type: "success" });
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    startResendTimer();
    toaster.create({ title: "Code Resent", description: "A new code has been sent. Use: 654321", type: "info" });
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) { setErrors({ code: "Please enter the reset code" }); return; }
    if (resetCode !== "654321") { setErrors({ code: "Invalid code. Use: 654321 (demo)" }); return; }
    setStep(2);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!newPassword) errs.newPassword = "Password is required";
    else if (newPassword.length < 8) errs.newPassword = "Must be at least 8 characters";
    else if (!/[A-Z]/.test(newPassword)) errs.newPassword = "Must contain an uppercase letter";
    else if (!/[0-9]/.test(newPassword)) errs.newPassword = "Must contain a number";
    if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    await resetPassword(email, newPassword);
    setLoading(false);
    setStep(3);
    toaster.create({ title: "Password Reset!", description: "You can now sign in with your new password.", type: "success" });
  };

  const steps = ["Enter Email", "Verify Code", "New Password", "Done"];

  return (
    <Flex minH="100vh" bg="bg.subtle" alignItems="center" justifyContent="center" p="8">
      <Box w="full" maxW="md">
        {/* Header */}
        <VStack gap="2" mb="8" textAlign="center">
          <HStack gap="2" justifyContent="center" mb="2">
            <Box w="10" h="10" bg="blue.500" borderRadius="xl" display="flex" alignItems="center" justifyContent="center">
              <LuShield size={20} color="white" />
            </Box>
            <Heading size="lg" fontWeight="bold">Central SSO Portal</Heading>
          </HStack>
          <Heading size="xl" fontWeight="bold">Reset Password</Heading>
        </VStack>

        {/* Step indicator */}
        <HStack gap="0" mb="8" justifyContent="center">
          {steps.map((label, i) => (
            <HStack key={i} gap="0">
              <VStack gap="1">
                <Box
                  w="8"
                  h="8"
                  borderRadius="full"
                  bg={step > i ? "blue.500" : step === i ? "blue.500" : "bg.muted"}
                  borderWidth={step === i ? "2px" : "1px"}
                  borderColor={step === i ? "blue.500" : "border"}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {step > i ? (
                    <Text fontSize="xs" color="white">✓</Text>
                  ) : (
                    <Text fontSize="xs" color={step === i ? "white" : "fg.muted"} fontWeight="bold">{i + 1}</Text>
                  )}
                </Box>
                <Text fontSize="2xs" color={step === i ? "blue.500" : "fg.subtle"} display={{ base: "none", sm: "block" }}>{label}</Text>
              </VStack>
              {i < steps.length - 1 && (
                <Box w="12" h="0.5" bg={step > i ? "blue.500" : "border"} mb="4" />
              )}
            </HStack>
          ))}
        </HStack>

        <Box bg="bg.panel" borderRadius="xl" shadow="md" p="8" borderWidth="1px" borderColor="border">
          {step === 0 && (
            <form onSubmit={handleEmailSubmit}>
              <VStack gap="5">
                <Box w="full" textAlign="center" mb="2">
                  <Box w="14" h="14" bg="blue.50" _dark={{ bg: "blue.950" }} borderRadius="2xl" display="flex" alignItems="center" justifyContent="center" mx="auto" mb="3">
                    <LuMail size={24} color="#2563eb" />
                  </Box>
                  <Text color="fg.muted" fontSize="sm">
                    Enter your email and we'll send you a reset code
                  </Text>
                </Box>

                <Field label="Email Address" invalid={!!errors.email} errorText={errors.email} w="full">
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                    size="lg"
                  />
                </Field>

                <Button type="submit" colorPalette="blue" size="lg" w="full" loading={loading} loadingText="Sending...">
                  Send Reset Code
                </Button>

                <Button variant="ghost" size="sm" onClick={() => onNavigate("login")}>
                  ← Back to Sign In
                </Button>
              </VStack>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleCodeSubmit}>
              <VStack gap="5" textAlign="center">
                <Box>
                  <Text color="fg.muted" fontSize="sm">
                    We sent a reset code to{" "}
                    <Text as="span" fontWeight="semibold" color="fg">{email}</Text>
                  </Text>
                </Box>

                <Field label="Reset Code" invalid={!!errors.code} errorText={errors.code} w="full">
                  <Input
                    placeholder="654321"
                    value={resetCode}
                    onChange={(e) => { setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErrors({}); }}
                    size="lg"
                    textAlign="center"
                    letterSpacing="0.3em"
                    fontSize="2xl"
                    maxLength={6}
                  />
                </Field>

                <Button type="submit" colorPalette="blue" size="lg" w="full">
                  Verify Code
                </Button>

                <HStack gap="2" justifyContent="center">
                  <Text fontSize="sm" color="fg.muted">Didn't receive it?</Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    color="blue.500"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    loading={loading}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
                  </Button>
                </HStack>

                <Box p="3" bg="bg.muted" borderRadius="lg" w="full">
                  <Text fontSize="xs" color="fg.muted"><strong>Demo code:</strong> 654321</Text>
                </Box>
              </VStack>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handlePasswordReset}>
              <VStack gap="5">
                <Box w="full" textAlign="center" mb="2">
                  <Heading size="md">Create New Password</Heading>
                  <Text color="fg.muted" fontSize="sm" mt="1">Your new password must be different from previous passwords</Text>
                </Box>

                <Field label="New Password" invalid={!!errors.newPassword} errorText={errors.newPassword} w="full">
                  <PasswordInput
                    placeholder="Create a strong password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setErrors((e2) => ({ ...e2, newPassword: "" })); }}
                  />
                </Field>

                {newPassword && (
                  <Box w="full">
                    <HStack justifyContent="space-between" mb="1">
                      <Text fontSize="xs" color="fg.muted">Password strength</Text>
                      <Badge colorPalette={passwordStrength.color} size="sm">{passwordStrength.label}</Badge>
                    </HStack>
                    <Progress.Root value={passwordStrength.score} colorPalette={passwordStrength.color} size="sm">
                      <Progress.Track borderRadius="full">
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                  </Box>
                )}

                <Field label="Confirm Password" invalid={!!errors.confirmPassword} errorText={errors.confirmPassword} w="full">
                  <PasswordInput
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors((e2) => ({ ...e2, confirmPassword: "" })); }}
                  />
                </Field>

                <Button type="submit" colorPalette="blue" size="lg" w="full" loading={loading} loadingText="Resetting...">
                  Reset Password
                </Button>
              </VStack>
            </form>
          )}

          {step === 3 && (
            <VStack gap="5" textAlign="center">
              <Box w="16" h="16" bg="green.50" _dark={{ bg: "green.950" }} borderRadius="full" display="flex" alignItems="center" justifyContent="center" mx="auto">
                <LuCircleCheck size={36} color="#10b981" />
              </Box>
              <VStack gap="1">
                <Heading size="md">Password Reset Successful!</Heading>
                <Text color="fg.muted" fontSize="sm">Your password has been updated. You can now sign in with your new password.</Text>
              </VStack>
              <Button colorPalette="blue" size="lg" w="full" onClick={() => onNavigate("login")}>
                Sign In Now
              </Button>
            </VStack>
          )}
        </Box>
      </Box>
    </Flex>
  );
}
