import { useEffect, useState } from "react";
import { useStore } from "@/store/store";
import { Toaster } from "@/components/ui/toaster";
import { Box, Spinner, VStack, Text } from "@chakra-ui/react";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import MyApplicationsPage from "@/pages/MyApplicationsPage";
import AccountSettingsPage from "@/pages/AccountSettingsPage";
import AppLauncherPage from "@/pages/AppLauncherPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminRolesPage from "@/pages/AdminRolesPage";
import AdminAppsPage from "@/pages/AdminAppsPage";
import AdminActivityPage from "@/pages/AdminActivityPage";
import AdminSSOPage from "@/pages/AdminSSOPage";
import AdminEmailPage from "@/pages/AdminEmailPage";

type Page =
  | "login"
  | "register"
  | "forgot-password"
  | "dashboard"
  | "my-apps"
  | "app-launcher"
  | "account-settings"
  | "admin-dashboard"
  | "admin-users"
  | "admin-roles"
  | "admin-apps"
  | "admin-activity"
  | "admin-sso"
  | "admin-email";

function AppContent() {
  const { auth, loading, fetchAllData } = useStore();
  const [page, setPage] = useState<Page>("login");

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Redirect to dashboard when authenticated
  useEffect(() => {
    if (auth.isAuthenticated && (page === "login" || page === "register" || page === "forgot-password")) {
      setPage("dashboard");
    }
    if (!auth.isAuthenticated && page !== "login" && page !== "register" && page !== "forgot-password") {
      setPage("login");
    }
  }, [auth.isAuthenticated, page]);

  const navigate = (target: string) => {
    setPage(target as Page);
  };

  // Show loading spinner while fetching initial data
  if (loading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.950">
        <VStack gap="4">
          <Spinner size="lg" color="blue.500" />
          <Text color="fg.muted">Loading portal...</Text>
        </VStack>
      </Box>
    );
  }

  // Auth pages (no shell)
  if (!auth.isAuthenticated) {
    if (page === "register") return <RegisterPage onNavigate={navigate} />;
    if (page === "forgot-password") return <ForgotPasswordPage onNavigate={navigate} />;
    return <LoginPage onNavigate={navigate} />;
  }

  // Authenticated pages (with shell)
  const renderPage = () => {
    switch (page) {
      case "my-apps": return <MyApplicationsPage />;
      case "app-launcher": return <AppLauncherPage />;
      case "account-settings": return <AccountSettingsPage />;
      case "admin-dashboard": return <AdminDashboardPage onNavigate={navigate} />;
      case "admin-users": return <AdminUsersPage />;
      case "admin-roles": return <AdminRolesPage />;
      case "admin-apps": return <AdminAppsPage />;
      case "admin-activity": return <AdminActivityPage />;
      case "admin-sso": return <AdminSSOPage />;
      case "admin-email": return <AdminEmailPage />;
      default: return <DashboardPage onNavigate={navigate} />;
    }
  };

  return (
    <AppShell currentPage={page} onNavigate={navigate}>
      {renderPage()}
    </AppShell>
  );
}

export default function App() {
  return (
    <>
      <AppContent />
      <Toaster />
    </>
  );
}
