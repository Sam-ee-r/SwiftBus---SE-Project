import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import Book from "./pages/Book";
import MyBookings from "./pages/MyBookings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageBuses from "./pages/admin/ManageBuses";
import ManageRoutes from "./pages/admin/ManageRoutes";
import ManageDrivers from "./pages/admin/ManageDrivers";
import ManageSchedules from "./pages/admin/ManageSchedules";
import ViewBookings from "./pages/admin/ViewBookings";
import ManageUsers from "./pages/admin/ManageUsers";
import SupportInbox from "./pages/admin/SupportInbox";
import ManageRefunds from "./pages/admin/ManageRefunds";
import DriverDashboard from "./pages/driver/DriverDashboard";
import ProfileDashboard from "./pages/ProfileDashboard";
import NotFound from "./pages/NotFound";
import TrackBus from "./pages/TrackBus";
import Wallet from "./pages/Wallet";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/search" element={<Search />} />
            <Route path="/book/schedule/:scheduleId" element={<Book />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<ProfileDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/buses" element={<ManageBuses />} />
            <Route path="/admin/routes" element={<ManageRoutes />} />
            <Route path="/admin/schedules" element={<ManageSchedules />} />
            <Route path="/admin/drivers" element={<ManageDrivers />} />
            <Route path="/admin/bookings" element={<ViewBookings />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/support" element={<SupportInbox />} />
            <Route path="/admin/refunds" element={<ManageRefunds />} />
            <Route path="/driver" element={<DriverDashboard />} />
            <Route path="/track/:scheduleId" element={<TrackBus />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
