import { useState } from "react";
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
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import { LuShield, LuLock, LuRefreshCw } from "react-icons/lu";

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

type LoginStep = "credentials" | "2fa";

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const { login, verify2FA, auth } = useStore();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const validateCredentials = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCredentials()) return;
    setLoading(true);
    setErrors({});
    const result = await login(email, password);
    setLoading(false);
    if (result.requires2FA) {
      setStep("2fa");
      toaster.create({ title: "2FA Required", description: "Enter code: 123456 (demo)", type: "info" });
    } else if (!result.success) {
      setErrors({ general: result.error || "Login failed" });
      triggerShake();
    }
    // success handled by auth state in parent
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFACode.trim()) {
      setErrors({ code: "Please enter the 6-digit code" });
      return;
    }
    if (twoFACode.length !== 6 || !/^\d+$/.test(twoFACode)) {
      setErrors({ code: "Code must be exactly 6 digits" });
      return;
    }
    setLoading(true);
    setErrors({});
    const result = await verify2FA(twoFACode);
    setLoading(false);
    if (!result.success) {
      setErrors({ code: result.error || "Invalid code" });
      triggerShake();
    }
  };

  const handleResendCode = () => {
    if (resendCooldown > 0) return;
    toaster.create({ title: "Code Resent", description: "A new code has been sent. Use: 123456", type: "success" });
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  return (
    <Flex minH="100vh" bg="bg.subtle">
      {/* Left panel */}
      <Box
        display={{ base: "none", lg: "flex" }}
        flex="1"
        bg="blue.600"
        _dark={{ bg: "blue.900" }}
        flexDir="column"
        alignItems="center"
        justifyContent="center"
        p="12"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top="-20%"
          right="-10%"
          w="400px"
          h="400px"
          borderRadius="full"
          bg="blue.500"
          opacity="0.3"
        />
        <Box
          position="absolute"
          bottom="-15%"
          left="-10%"
          w="300px"
          h="300px"
          borderRadius="full"
          bg="purple.500"
          opacity="0.3"
        />
        <VStack gap="6" position="relative" textAlign="center">
          <Box
            w="16"
            h="16"
            bg="white"
            borderRadius="2xl"
            display="flex"
            alignItems="center"
            justifyContent="center"
            shadow="xl"
          >
            <LuShield size={32} color="#2563eb" />
          </Box>
          <Heading size="2xl" color="white" fontWeight="bold">
            Central SSO Portal
          </Heading>
          <Text color="blue.100" fontSize="lg" maxW="sm">
            Secure single sign-on access to all your enterprise applications
          </Text>
          <VStack gap="3" mt="8" alignItems="start" w="full" maxW="xs">
            {["Unified access to all apps", "Enterprise-grade security", "Two-factor authentication", "Role-based permissions"].map((f) => (
              <HStack key={f} gap="3">
                <Box w="5" h="5" borderRadius="full" bg="teal.400" display="flex" alignItems="center" justifyContent="center">
                  <Text fontSize="xs" color="white">✓</Text>
                </Box>
                <Text color="blue.100" fontSize="sm">{f}</Text>
              </HStack>
            ))}
          </VStack>
        </VStack>
      </Box>

      {/* Right panel */}
      <Flex flex={{ base: "1", lg: "none" }} w={{ lg: "480px" }} alignItems="center" justifyContent="center" p="8">
        <Box w="full" maxW="sm">
          {step === "credentials" ? (
            <>
              <VStack gap="2" mb="8" alignItems="start">
                <Heading size="xl" fontWeight="bold">Welcome back</Heading>
                <Text color="fg.muted">Sign in to your account to continue</Text>
              </VStack>

              <form onSubmit={handleLoginSubmit}>
                <VStack gap="5">
                  {errors.general && (
                    <Box
                      w="full"
                      p="3"
                      bg="red.50"
                      _dark={{ bg: "red.950", borderColor: "red.800" }}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="red.200"
                      css={shake ? { animation: "shake 0.5s ease" } : {}}
                    >
                      <Text color="fg.error" fontSize="sm">{errors.general}</Text>
                    </Box>
                  )}

                  <Field label="Email address" invalid={!!errors.email} errorText={errors.email} w="full">
                    <Input
                      placeholder="you@company.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      size="lg"
                    />
                  </Field>

                  <Field label="Password" invalid={!!errors.password} errorText={errors.password} w="full">
                    <PasswordInput
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      size="lg"
                    />
                  </Field>

                  <Flex w="full" alignItems="center" justifyContent="space-between">
                    <Checkbox
                      checked={rememberMe}
                      onCheckedChange={(d) => setRememberMe(!!d.checked)}
                    >
                      Remember me
                    </Checkbox>
                    <Button
                      variant="ghost"
                      size="sm"
                      color="blue.500"
                      onClick={() => onNavigate("forgot-password")}
                      type="button"
                    >
                      Forgot password?
                    </Button>
                  </Flex>

                  <Button
                    type="submit"
                    colorPalette="blue"
                    size="lg"
                    w="full"
                    loading={loading}
                    loadingText="Signing in..."
                  >
                    Sign in
                  </Button>
                </VStack>
              </form>

              <Text textAlign="center" mt="6" color="fg.muted" fontSize="sm">
                Don't have an account?{" "}
                <Button
                  variant="ghost"
                  size="xs"
                  color="blue.500"
                  onClick={() => onNavigate("register")}
                >
                  Create account
                </Button>
              </Text>

              <Box mt="4" p="3" bg="bg.muted" borderRadius="lg">
                <Text fontSize="xs" color="fg.muted" textAlign="center">
                  <strong>Demo:</strong> admin@example.com / Admin@123 (with 2FA)
                  <br />
                  bob@example.com / Admin@123 (no 2FA)
                </Text>
              </Box>
            </>
          ) : (
            <>
              <VStack gap="2" mb="8" alignItems="center" textAlign="center">
                <Box w="16" h="16" bg="blue.50" _dark={{ bg: "blue.950" }} borderRadius="2xl" display="flex" alignItems="center" justifyContent="center" mb="2">
                  <LuLock size={28} color="#2563eb" />
                </Box>
                <Heading size="xl" fontWeight="bold">Two-Factor Authentication</Heading>
                <Text color="fg.muted">
                  Enter the 6-digit code sent to your authenticator app or email
                </Text>
                <Badge colorPalette="blue" size="sm">{email}</Badge>
              </VStack>

              <form onSubmit={handleVerify2FA}>
                <VStack gap="5">
                  <Field label="Authentication Code" invalid={!!errors.code} errorText={errors.code} w="full">
                    <Input
                      placeholder="123456"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      size="lg"
                      textAlign="center"
                      letterSpacing="0.3em"
                      fontSize="2xl"
                      maxLength={6}
                    />
                  </Field>

                  <Button type="submit" colorPalette="blue" size="lg" w="full" loading={loading} loadingText="Verifying...">
                    Verify Code
                  </Button>

                  <HStack gap="2" justifyContent="center">
                    <Text fontSize="sm" color="fg.muted">Didn't receive a code?</Text>
                    <Button
                      variant="ghost"
                      size="sm"
                      color="blue.500"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0}
                    >
                      {resendCooldown > 0 ? (
                        <HStack gap="1">
                          <LuRefreshCw size={14} />
                          <span>Resend in {resendCooldown}s</span>
                        </HStack>
                      ) : "Resend Code"}
                    </Button>
                  </HStack>

                  <Button variant="ghost" size="sm" onClick={() => { setStep("credentials"); setTwoFACode(""); setErrors({}); }}>
                    ← Back to login
                  </Button>
                </VStack>
              </form>

              <Box mt="4" p="3" bg="bg.muted" borderRadius="lg">
                <Text fontSize="xs" color="fg.muted" textAlign="center">
                  <strong>Demo code:</strong> 123456
                </Text>
              </Box>
            </>
          )}
        </Box>
      </Flex>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </Flex>
  );
}
