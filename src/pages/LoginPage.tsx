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
  SimpleGrid,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import { signInWithProvider, SocialProviders } from "@/lib/supertokens";
import {
  LuShield,
  LuLock,
  LuRefreshCw,
  LuFingerprint,
  LuArrowRight,
  LuSparkles,
  LuZap,
  LuGlobe,
  LuKeyRound,
} from "react-icons/lu";

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

type LoginStep = "credentials" | "2fa";

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const { login, verify2FA } = useStore();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const features = [
    { icon: LuGlobe, title: "Unified Access", desc: "One login for all apps" },
    { icon: LuShield, title: "Enterprise Security", desc: "SOC2 compliant" },
    { icon: LuFingerprint, title: "Biometric 2FA", desc: "Fingerprint & face ID" },
    { icon: LuZap, title: "Lightning Fast", desc: "Sub-second auth" },
  ];

  return (
    <Flex minH="100vh" position="relative" overflow="hidden" bg="gray.950">
      {/* Animated gradient background */}
      <Box
        position="absolute"
        inset="0"
        bgGradient="linear(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)"
        zIndex="0"
      />
      {/* Floating orbs */}
      <Box
        position="absolute"
        top="-10%"
        left="-5%"
        w="500px"
        h="500px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)"
        filter="blur(40px)"
        animation="float1 8s ease-in-out infinite"
        zIndex="0"
      />
      <Box
        position="absolute"
        bottom="-15%"
        right="-5%"
        w="600px"
        h="600px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)"
        filter="blur(50px)"
        animation="float2 10s ease-in-out infinite"
        zIndex="0"
      />
      <Box
        position="absolute"
        top="40%"
        left="50%"
        w="400px"
        h="400px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(20,184,166,0.2) 0%, transparent 70%)"
        filter="blur(45px)"
        animation="float3 12s ease-in-out infinite"
        zIndex="0"
      />
      {/* Grid overlay */}
      <Box
        position="absolute"
        inset="0"
        bgImage="linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)"
        bgSize="40px 40px"
        zIndex="0"
      />

      <Flex
        position="relative"
        zIndex="1"
        w="full"
        minH="100vh"
        alignItems="center"
        justifyContent="center"
        p={{ base: "4", md: "8" }}
      >
        {/* Main card container */}
        <Flex
          maxW="1100px"
          w="full"
          borderRadius="3xl"
          overflow="hidden"
          shadow="2xl"
          bg="whiteAlpha.50"
          backdropFilter="blur(20px)"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          css={mounted ? { animation: "cardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1)" } : { opacity: 0 }}
          minH="600px"
        >
          {/* Left brand panel */}
          <Box
            display={{ base: "none", md: "flex" }}
            flex="1"
            flexDir="column"
            justifyContent="space-between"
            p="10"
            position="relative"
            overflow="hidden"
            bgGradient="linear(160deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 50%, rgba(20,184,166,0.08) 100%)"
          >
            {/* Decorative shield glow */}
            <Box
              position="absolute"
              top="20%"
              right="10%"
              w="200px"
              h="200px"
              borderRadius="full"
              bg="radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)"
              filter="blur(30px)"
              animation="pulseGlow 4s ease-in-out infinite"
            />

            <VStack gap="4" alignItems="start" position="relative">
              <HStack gap="3" css={mounted ? { animation: "slideRight 0.6s 0.1s both" } : {}}>
                <Box
                  w="12"
                  h="12"
                  borderRadius="2xl"
                  bgGradient="linear(135deg, #6366f1, #8b5cf6)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  shadow="0 8px 24px rgba(99,102,241,0.4)"
                >
                  <LuShield size={24} color="white" />
                </Box>
                <VStack gap="0" alignItems="start">
                  <Text fontSize="lg" fontWeight="bold" color="white" letterSpacing="tight">Central SSO</Text>
                  <Text fontSize="xs" color="whiteAlpha.600" letterSpacing="wide" textTransform="uppercase">Portal</Text>
                </VStack>
              </HStack>
            </VStack>

            <VStack gap="6" alignItems="start" position="relative" css={mounted ? { animation: "slideRight 0.6s 0.2s both" } : {}}>
              <Heading
                size="2xl"
                color="white"
                fontWeight="bold"
                lineHeight="1.1"
                letterSpacing="tight"
                maxW="sm"
              >
                Secure access to{" "}
                <Text
                  as="span"
                  bgGradient="linear(90deg, #818cf8, #c4b5fd, #5eead4)"
                  bgClip="text"
                  _dark={{ bgClip: "text" }}
                >
                  everything
                </Text>
              </Heading>
              <Text color="whiteAlpha.700" fontSize="md" maxW="sm" lineHeight="1.6">
                One identity. Every application. Zero friction. Sign in once and access your entire digital workspace.
              </Text>
            </VStack>

            {/* Feature grid */}
            <SimpleGrid columns={2} gap="4" w="full" maxW="sm" position="relative" css={mounted ? { animation: "slideRight 0.6s 0.3s both" } : {}}>
              {features.map((f, i) => {
                const FIcon = f.icon;
                return (
                  <HStack
                    key={f.title}
                    gap="3"
                    p="3"
                    borderRadius="xl"
                    bg="whiteAlpha.50"
                    backdropFilter="blur(10px)"
                    borderWidth="1px"
                    borderColor="whiteAlpha.100"
                    _hover={{ bg: "whiteAlpha.100", transform: "translateY(-2px)" }}
                    transition="all 0.2s"
                    css={{ animation: `featureIn 0.5s ${0.4 + i * 0.1}s both` }}
                  >
                    <Box
                      w="9"
                      h="9"
                      borderRadius="lg"
                      bgGradient="linear(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink="0"
                    >
                      <FIcon size={16} color="#a5b4fc" />
                    </Box>
                    <VStack gap="0" alignItems="start">
                      <Text fontSize="xs" fontWeight="semibold" color="white">{f.title}</Text>
                      <Text fontSize="2xs" color="whiteAlpha.600">{f.desc}</Text>
                    </VStack>
                  </HStack>
                );
              })}
            </SimpleGrid>

            <HStack gap="2" position="relative" css={mounted ? { animation: "slideRight 0.6s 0.5s both" } : {}}>
              <HStack gap="1.5">
                <Box w="2" h="2" borderRadius="full" bg="green.400" animation="blink 2s infinite" />
                <Text fontSize="xs" color="whiteAlpha.600">All systems operational</Text>
              </HStack>
            </HStack>
          </Box>

          {/* Right form panel */}
          <Flex
            flex={{ base: "1", md: "0.85" }}
            alignItems="center"
            justifyContent="center"
            p={{ base: "6", md: "10" }}
            bg="whiteAlpha.800"
            _dark={{ bg: "blackAlpha.400" }}
            backdropFilter="blur(20px)"
            position="relative"
          >
            <Box w="full" maxW="sm" css={mounted ? { animation: "formIn 0.6s 0.15s both" } : { opacity: 0 }}>
              {step === "credentials" ? (
                <>
                  <VStack gap="2" mb="8" alignItems="start">
                    <HStack gap="2" mb="2">
                      <Badge
                        colorPalette="purple"
                        size="sm"
                        variant="subtle"
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        <LuSparkles size={10} style={{ display: "inline", marginRight: 4 }} />
                        Sign In
                      </Badge>
                    </HStack>
                    <Heading size="xl" fontWeight="bold" letterSpacing="tight">Welcome back</Heading>
                    <Text color="fg.muted" fontSize="sm">Enter your credentials to access the portal</Text>
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
                          <HStack gap="2">
                            <Box w="5" h="5" borderRadius="full" bg="red.500" display="flex" alignItems="center" justifyContent="center" flexShrink="0">
                              <Text fontSize="xs" color="white" fontWeight="bold">!</Text>
                            </Box>
                            <Text color="fg.error" fontSize="sm">{errors.general}</Text>
                          </HStack>
                        </Box>
                      )}

                      <Field label="Email address" invalid={!!errors.email} errorText={errors.email} w="full">
                        <Input
                          placeholder="you@company.com"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          size="lg"
                          borderRadius="xl"
                          bg="whiteAlpha.500"
                          _dark={{ bg: "whiteAlpha.50" }}
                          borderWidth="1px"
                          borderColor="border"
                          _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 3px rgba(139,92,246,0.15)" }}
                          transition="all 0.2s"
                        />
                      </Field>

                      <Field label="Password" invalid={!!errors.password} errorText={errors.password} w="full">
                        <PasswordInput
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          size="lg"
                          borderRadius="xl"
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
                          color="purple.500"
                          _hover={{ color: "purple.600", bg: "purple.50" }}
                          onClick={() => onNavigate("forgot-password")}
                          type="button"
                        >
                          Forgot password?
                        </Button>
                      </Flex>

                      <Button
                        type="submit"
                        size="lg"
                        w="full"
                        borderRadius="xl"
                        loading={loading}
                        loadingText="Signing in..."
                        bgGradient="linear(90deg, #6366f1, #8b5cf6)"
                        color="white"
                        _hover={{ bgGradient: "linear(90deg, #4f46e5, #7c3aed)", transform: "translateY(-1px)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}
                        _active={{ transform: "translateY(0)" }}
                        transition="all 0.2s"
                        rightIcon={<LuArrowRight size={18} />}
                      >
                        Sign in to Portal
                      </Button>

                      {/* Divider */}
                      <HStack w="full" gap="3" my="1">
                        <Box flex="1" h="1px" bg="border" />
                        <Text fontSize="xs" color="fg.subtle" whiteSpace="nowrap">or continue with</Text>
                        <Box flex="1" h="1px" bg="border" />
                      </HStack>

                      {/* SSO provider buttons - SuperTokens ThirdParty */}
                      <HStack gap="3" w="full">
                        {SocialProviders.slice(0, 3).map((p) => (
                          <Button
                            key={p.id}
                            variant="outline"
                            size="md"
                            flex="1"
                            borderRadius="xl"
                            borderWidth="1px"
                            borderColor="border"
                            _hover={{ bg: "bg.subtle", borderColor: "purple.300", transform: "translateY(-1px)" }}
                            transition="all 0.2s"
                            onClick={async () => {
                              const result = await signInWithProvider(p.id);
                              if (!result.ok) {
                                toaster.create({
                                  title: `${p.label} SSO`,
                                  description: "SuperTokens backend not connected — configure API domain in Admin › SSO Configuration.",
                                  type: "warning",
                                });
                              }
                            }}
                            aria-label={`Sign in with ${p.label}`}
                          >
                            <Box
                              w="6" h="6"
                              borderRadius="md"
                              bg={p.color}
                              color="white"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              fontSize="sm"
                              fontWeight="bold"
                            >
                              {p.letterIcon || p.label[0]}
                            </Box>
                          </Button>
                        ))}
                      </HStack>

                      <Text fontSize="xs" color="fg.subtle" textAlign="center" mt="1">
                        Powered by{" "}
                        <Text
                          as="span"
                          fontWeight="semibold"
                          color="purple.500"
                          cursor="pointer"
                          _hover={{ textDecoration: "underline" }}
                          onClick={() => window.open("https://supertokens.com", "_blank", "noopener,noreferrer")}
                        >
                          SuperTokens
                        </Text>
                        {" "}SSO
                      </Text>
                    </VStack>
                  </form>

                  <Text textAlign="center" mt="6" color="fg.muted" fontSize="sm">
                    Don't have an account?{" "}
                    <Button
                      variant="ghost"
                      size="xs"
                      color="purple.500"
                      _hover={{ color: "purple.600", bg: "purple.50" }}
                      onClick={() => onNavigate("register")}
                    >
                      Create account
                    </Button>
                  </Text>

                  <Box mt="4" p="3" bg="purple.50" _dark={{ bg: "purple.950", borderColor: "purple.900" }} borderRadius="lg" borderWidth="1px" borderColor="purple.100">
                    <Text fontSize="xs" color="fg.muted" textAlign="center">
                      <strong>Demo:</strong> admin@example.com / Admin@123 (with 2FA)
                    </Text>
                  </Box>
                </>
              ) : (
                <>
                  <VStack gap="3" mb="8" alignItems="center" textAlign="center" css={{ animation: "stepIn 0.4s ease both" }}>
                    <Box
                      w="16"
                      h="16"
                      borderRadius="2xl"
                      bgGradient="linear(135deg, #6366f1, #8b5cf6)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      mb="2"
                      shadow="0 8px 24px rgba(99,102,241,0.35)"
                      animation="iconPulse 2s ease-in-out infinite"
                    >
                      <LuKeyRound size={28} color="white" />
                    </Box>
                    <Heading size="xl" fontWeight="bold" letterSpacing="tight">Verify Your Identity</Heading>
                    <Text color="fg.muted" fontSize="sm" maxW="xs">
                      Enter the 6-digit code from your authenticator app
                    </Text>
                    <Badge colorPalette="purple" size="sm" variant="subtle">{email}</Badge>
                  </VStack>

                  <form onSubmit={handleVerify2FA}>
                    <VStack gap="5">
                      <Field label="Authentication Code" invalid={!!errors.code} errorText={errors.code} w="full">
                        <Input
                          placeholder="••••••"
                          value={twoFACode}
                          onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          size="lg"
                          textAlign="center"
                          letterSpacing="0.5em"
                          fontSize="2xl"
                          maxLength={6}
                          fontWeight="bold"
                          borderRadius="xl"
                          bg="whiteAlpha.500"
                          _dark={{ bg: "whiteAlpha.50" }}
                          borderWidth="2px"
                          borderColor={errors.code ? "red.400" : "purple.200"}
                          _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 4px rgba(139,92,246,0.15)" }}
                          transition="all 0.2s"
                          css={shake ? { animation: "shake 0.5s ease" } : {}}
                        />
                      </Field>

                      {/* Code digit indicators */}
                      <HStack gap="2" w="full" justifyContent="center">
                        {Array.from({ length: 6 }, (_, i) => (
                          <Box
                            key={i}
                            w="8"
                            h="1.5"
                            borderRadius="full"
                            bg={twoFACode.length > i ? "purple.500" : "border"}
                            transition="all 0.2s"
                          />
                        ))}
                      </HStack>

                      <Button
                        type="submit"
                        size="lg"
                        w="full"
                        borderRadius="xl"
                        loading={loading}
                        loadingText="Verifying..."
                        bgGradient="linear(90deg, #6366f1, #8b5cf6)"
                        color="white"
                        _hover={{ bgGradient: "linear(90deg, #4f46e5, #7c3aed)", transform: "translateY(-1px)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}
                        _active={{ transform: "translateY(0)" }}
                        transition="all 0.2s"
                        rightIcon={<LuArrowRight size={18} />}
                      >
                        Verify & Continue
                      </Button>

                      <HStack gap="2" justifyContent="center" w="full">
                        <Text fontSize="sm" color="fg.muted">Didn't receive a code?</Text>
                        <Button
                          variant="ghost"
                          size="sm"
                          color="purple.500"
                          _hover={{ bg: "purple.50" }}
                          onClick={handleResendCode}
                          disabled={resendCooldown > 0}
                        >
                          {resendCooldown > 0 ? (
                            <HStack gap="1">
                              <LuRefreshCw size={14} animation={resendCooldown > 0 ? "spin 1s linear infinite" : undefined} />
                              <span>Resend in {resendCooldown}s</span>
                            </HStack>
                          ) : "Resend Code"}
                        </Button>
                      </HStack>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setStep("credentials"); setTwoFACode(""); setErrors({}); }}
                        w="full"
                      >
                        ← Back to login
                      </Button>
                    </VStack>
                  </form>

                  <Box mt="4" p="3" bg="purple.50" _dark={{ bg: "purple.950", borderColor: "purple.900" }} borderRadius="lg" borderWidth="1px" borderColor="purple.100">
                    <HStack gap="2" justifyContent="center">
                      <LuLock size={12} color="var(--chakra-colors-purple-500)" />
                      <Text fontSize="xs" color="fg.muted" textAlign="center">
                        <strong>Demo code:</strong> 123456
                      </Text>
                    </HStack>
                  </Box>
                </>
              )}
            </Box>
          </Flex>
        </Flex>
      </Flex>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(4px); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes formIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes featureIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-40px, 20px); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 40px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 24px rgba(99,102,241,0.35); }
          50% { transform: scale(1.05); box-shadow: 0 12px 32px rgba(99,102,241,0.5); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Flex>
  );
}
