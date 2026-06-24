import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute } from './components/ProtectedRoutes';
import { Navbar } from './components/Navbar';

// Common pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

// Student pages
import { Dashboard } from './pages/Dashboard';
import { DailyMenu } from './pages/DailyMenu';
import { FoodDetails } from './pages/FoodDetails';
import { Cart } from './pages/Cart';
import { CheckoutPayment } from './pages/CheckoutPayment';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { OrderTracking } from './pages/OrderTracking';
import { OrderHistory } from './pages/OrderHistory';
import { FeedbackForm } from './pages/FeedbackForm';

// Admin pages
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { OrderManagement } from './pages/admin/OrderManagement';
import { MenuManagement } from './pages/admin/MenuManagement';
import { PaymentManagement } from './pages/admin/PaymentManagement';
import { FeedbackManagement } from './pages/admin/FeedbackManagement';
import { Analytics } from './pages/admin/Analytics';
import { ScanQR } from './pages/admin/ScanQR';
import { PaymentSettings } from './pages/admin/PaymentSettings';
import { PaymentReview } from './pages/admin/PaymentReview';

// Canteen Staff pages
import { CanteenLogin } from './pages/canteen/CanteenLogin';
import { CanteenDashboard } from './pages/canteen/CanteenDashboard';
import { CanteenMenu } from './pages/canteen/CanteenMenu';

const queryClient = new QueryClient();

// Global loading screen shown during initial auth verification
const AuthLoadingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse font-medium tracking-wide">Initializing session...</p>
      </div>
    );
  }
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AuthLoadingGuard>
            <CartProvider>
              <SocketProvider>
                <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-12">
                  <Navbar />
                  
                  <main className="flex-grow">
                    <Routes>
                      {/* Public Auth routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/admin/login" element={<AdminLogin />} />
                      <Route path="/canteen/login" element={<CanteenLogin />} />

                      {/* Protected Student Routes */}
                      <Route element={<ProtectedRoute allowedRole="student" />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/menu" element={<DailyMenu />} />
                        <Route path="/menu/:id" element={<FoodDetails />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/checkout-payment" element={<CheckoutPayment />} />
                        <Route path="/payment/success" element={<PaymentSuccess />} />
                        <Route path="/tracking/:id" element={<OrderTracking />} />
                        <Route path="/history" element={<OrderHistory />} />
                        <Route path="/feedback/:orderId" element={<FeedbackForm />} />
                      </Route>

                      {/* Protected Admin Routes */}
                      <Route element={<ProtectedRoute allowedRole="admin" />}>
                        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        <Route path="/admin/orders" element={<OrderManagement />} />
                        <Route path="/admin/menu" element={<MenuManagement />} />
                        <Route path="/admin/payments" element={<PaymentManagement />} />
                        <Route path="/admin/payments/settings" element={<PaymentSettings />} />
                        <Route path="/admin/payments/review" element={<PaymentReview />} />
                        <Route path="/admin/feedback" element={<FeedbackManagement />} />
                        <Route path="/admin/analytics" element={<Analytics />} />
                        <Route path="/admin/scan-qr" element={<ScanQR />} />
                      </Route>

                      {/* Protected Canteen Staff Routes */}
                      <Route element={<ProtectedRoute allowedRole="canteen" />}>
                        <Route path="/canteen" element={<Navigate to="/canteen/dashboard" replace />} />
                        <Route path="/canteen/dashboard" element={<CanteenDashboard />} />
                        <Route path="/canteen/menu" element={<CanteenMenu />} />
                      </Route>

                      {/* Wildcard Fallback */}
                      <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                  </main>
                </div>
              </SocketProvider>
            </CartProvider>
          </AuthLoadingGuard>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
