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
  Progress,
  Badge,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import { LuCircleCheck } from "react-icons/lu";

interface RegisterPageProps {
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

export default function RegisterPage({ onNavigate }: RegisterPageProps) {
  const { register } = useStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verifyCode, setVerifyCode] = useState("");
  const [registered, setRegistered] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    password: "",
    confirmPassword: "",
  });

  const setField = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const passwordStrength = getPasswordStrength(form.password);

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(form.password)) errs.password = "Password must contain an uppercase letter";
    else if (!/[0-9]/.test(form.password)) errs.password = "Password must contain a number";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setLoading(true);
    // Check duplicate email
    const result = await register({ ...form, password: form.password });
    setLoading(false);
    if (!result.success) {
      setErrors({ email: result.error || "Registration failed" });
      return;
    }
    setStep(1);
    toaster.create({ title: "Account Created!", description: "Enter verification code: 789012", type: "success" });
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) {
      setErrors({ code: "Please enter the verification code" });
      return;
    }
    if (verifyCode !== "789012") {
      setErrors({ code: "Invalid code. Use: 789012 (demo)" });
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setRegistered(true);
    toaster.create({ title: "Email Verified!", description: "You can now log in.", type: "success" });
  };

  if (registered) {
    return (
      <Flex minH="100vh" bg="gray.950" alignItems="center" justifyContent="center" p="8">
        <Box maxW="sm" w="full" textAlign="center">
          <Box w="20" h="20" bg="green.950" borderRadius="full" display="flex" alignItems="center" justifyContent="center" mx="auto" mb="6">
            <LuCircleCheck size={40} color="#4ade80" />
          </Box>
          <Heading size="xl" mb="3">Registration Complete!</Heading>
          <Text color="fg.muted" mb="8">Your account has been verified. You can now sign in with your credentials.</Text>
          <Button colorPalette="blue" size="lg" w="full" onClick={() => onNavigate("login")}>
            Go to Sign In
          </Button>
        </Box>
      </Flex>
    );
  }

  return (
    <Flex minH="100vh" bg="gray.950" alignItems="center" justifyContent="center" p="8">
      <Box w="full" maxW="lg">
        {/* Header */}
        <VStack gap="2" mb="8" textAlign="center">
          <Box w="10" h="10" bg="blue.500" borderRadius="xl" display="flex" alignItems="center" justifyContent="center">
            <Text fontSize="lg" fontWeight="bold" color="white">SSO</Text>
          </Box>
          <Heading size="xl" fontWeight="bold">Create your account</Heading>
          <Text color="fg.muted">Join your organization's SSO portal</Text>
        </VStack>

        {/* Steps indicator */}
        <HStack gap="4" mb="8" justifyContent="center">
          {["Account Details", "Verify Email"].map((label, i) => (
            <HStack key={i} gap="2">
              <Box
                w="8"
                h="8"
                borderRadius="full"
                bg={step >= i ? "blue.500" : "bg.muted"}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="sm" color={step >= i ? "white" : "fg.muted"} fontWeight="bold">{i + 1}</Text>
              </Box>
              <Text fontSize="sm" fontWeight={step === i ? "semibold" : "normal"} color={step === i ? "fg" : "fg.muted"}>{label}</Text>
              {i < 1 && <Box w="8" h="0.5" bg={step > i ? "blue.500" : "border"} />}
            </HStack>
          ))}
        </HStack>

        <Box bg="bg.panel" borderRadius="xl" shadow="md" p="8" borderWidth="1px" borderColor="border">
          {step === 0 ? (
            <form onSubmit={handleStep1}>
              <VStack gap="5">
                <HStack gap="4" w="full">
                  <Field label="First Name" invalid={!!errors.firstName} errorText={errors.firstName} flex="1">
                    <Input
                      placeholder="John"
                      value={form.firstName}
                      onChange={(e) => setField("firstName", e.target.value)}
                    />
                  </Field>
                  <Field label="Last Name" invalid={!!errors.lastName} errorText={errors.lastName} flex="1">
                    <Input
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={(e) => setField("lastName", e.target.value)}
                    />
                  </Field>
                </HStack>

                <Field label="Work Email" invalid={!!errors.email} errorText={errors.email} w="full">
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </Field>

                <HStack gap="4" w="full">
                  <Field label="Phone (optional)" flex="1">
                    <Input
                      placeholder="+1 (555) 000-0000"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                    />
                  </Field>
                  <Field label="Department (optional)" flex="1">
                    <Input
                      placeholder="Engineering"
                      value={form.department}
                      onChange={(e) => setField("department", e.target.value)}
                    />
                  </Field>
                </HStack>

                <Field label="Password" invalid={!!errors.password} errorText={errors.password} w="full">
                  <PasswordInput
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                  />
                </Field>

                {form.password && (
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
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                  />
                </Field>

                <Button type="submit" colorPalette="blue" size="lg" w="full" loading={loading} loadingText="Creating account...">
                  Create Account
                </Button>
              </VStack>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <VStack gap="5" textAlign="center">
                <Box w="16" h="16" bg="blue.950" borderRadius="2xl" display="flex" alignItems="center" justifyContent="center" mx="auto">
                  <Text fontSize="3xl">📧</Text>
                </Box>
                <VStack gap="1">
                  <Heading size="md">Check your email</Heading>
                  <Text color="fg.muted" fontSize="sm">
                    We sent a 6-digit verification code to{" "}
                    <Text as="span" fontWeight="semibold" color="fg">{form.email}</Text>
                  </Text>
                </VStack>

                <Field label="Verification Code" invalid={!!errors.code} errorText={errors.code} w="full">
                  <Input
                    placeholder="789012"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    size="lg"
                    textAlign="center"
                    letterSpacing="0.3em"
                    fontSize="2xl"
                    maxLength={6}
                  />
                </Field>

                <Button type="submit" colorPalette="blue" size="lg" w="full" loading={loading} loadingText="Verifying...">
                  Verify Email
                </Button>

                <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                  ← Back to details
                </Button>

                <Box p="3" bg="bg.muted" borderRadius="lg" w="full">
                  <Text fontSize="xs" color="fg.muted"><strong>Demo code:</strong> 789012</Text>
                </Box>
              </VStack>
            </form>
          )}
        </Box>

        <Text textAlign="center" mt="6" color="fg.muted" fontSize="sm">
          Already have an account?{" "}
          <Button variant="ghost" size="xs" color="blue.500" onClick={() => onNavigate("login")}>
            Sign in
          </Button>
        </Text>
      </Box>
    </Flex>
  );
}
