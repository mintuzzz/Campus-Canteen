import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
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

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
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

                    {/* Protected Student Routes */}
                    <Route element={<ProtectedRoute allowedRole="student" />}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/menu" element={<DailyMenu />} />
                      <Route path="/menu/:id" element={<FoodDetails />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout-payment" element={<CheckoutPayment />} />
                      <Route path="/tracking/:id" element={<OrderTracking />} />
                      <Route path="/history" element={<OrderHistory />} />
                      <Route path="/feedback/:orderId" element={<FeedbackForm />} />
                    </Route>

                    {/* Protected Admin Routes */}
                    <Route element={<ProtectedRoute allowedRole="admin" />}>
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                      <Route path="/admin/orders" element={<OrderManagement />} />
                      <Route path="/admin/menu" element={<MenuManagement />} />
                      <Route path="/admin/payments" element={<PaymentManagement />} />
                      <Route path="/admin/feedback" element={<FeedbackManagement />} />
                      <Route path="/admin/analytics" element={<Analytics />} />
                    </Route>

                    {/* Wildcard Fallback */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </main>
              </div>
            </SocketProvider>
          </CartProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
