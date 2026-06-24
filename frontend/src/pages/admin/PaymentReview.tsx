import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ShieldCheck, AlertCircle, CheckCircle, XCircle, FileText, Calendar, Clock, RefreshCw, ZoomIn, Info } from 'lucide-react';
import axios from 'axios';

interface OrderVerification {
  _id: string;
  orderReference: string;
  tokenNumber: string;
  totalAmount: number;
  transactionId: string;
  paymentScreenshot: string;
  ocrResult: {
    extractedAmount: number;
    extractedUpiId: string;
    extractedPayeeName: string;
    extractedTransactionId: string;
    extractedDate: string;
    extractedTime: string;
    validationStatus: 'LIKELY_VALID' | 'REVIEW_REQUIRED';
  };
  userId: {
    name: string;
    email: string;
    phone: string;
    studentId: string;
    department: string;
  };
  createdAt: string;
}

export const PaymentReview: React.FC = () => {
  const { user } = useAuth();
  const { socket, addToast } = useSocket();
  const [orders, setOrders] = useState<OrderVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderVerification | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [zoomScreenshot, setZoomScreenshot] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:5000';
  const headers = { Authorization: `Bearer ${user?.token}` };

  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/orders/pending-payments`, { headers });
      setOrders(res.data);
      if (res.data.length > 0) {
        setSelectedOrder(res.data[0]);
      } else {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      console.error(err);
      addToast('Error', 'Failed to retrieve pending payments.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPendingPayments();
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    socket.on('pendingPayment', (data: any) => {
      addToast('New UPI Payment Uploaded', `Order ${data.orderReference} requires verification.`, 'info');
      fetchPendingPayments();
    });

    socket.on('orderStatusChanged', () => {
      // Re-fetch list if status transitions happen externally
      fetchPendingPayments();
    });

    return () => {
      socket.off('pendingPayment');
      socket.off('orderStatusChanged');
    };
  }, [socket]);

  const handleApprove = async (orderId: string) => {
    setActioning(true);
    try {
      const res = await axios.post(`${API_URL}/orders/${orderId}/approve-payment`, {}, { headers });
      addToast('Payment Approved', res.data.message || 'Order accepted.', 'success');
      
      // Update list
      const updated = orders.filter(o => o._id !== orderId);
      setOrders(updated);
      setSelectedOrder(updated.length > 0 ? updated[0] : null);
    } catch (err: any) {
      console.error(err);
      addToast('Approval Failed', err.response?.data?.message || 'Server error approving payment.', 'warning');
    } finally {
      setActioning(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setActioning(true);
    try {
      const res = await axios.post(
        `${API_URL}/orders/${selectedOrder._id}/reject-payment`,
        { rejectionReason: rejectReason.trim() },
        { headers }
      );
      addToast('Payment Rejected', res.data.message || 'Order cancelled.', 'info');
      
      const updated = orders.filter(o => o._id !== selectedOrder._id);
      setOrders(updated);
      setSelectedOrder(updated.length > 0 ? updated[0] : null);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (err: any) {
      console.error(err);
      addToast('Rejection Failed', err.response?.data?.message || 'Server error rejecting payment.', 'warning');
    } finally {
      setActioning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs animate-pulse font-medium">Retrieving verification queue...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-amber-500" size={24} />
            UPI Payment Verification
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Review manual UPI deposits, compare OCR details, and approve/reject kitchen preparation queue.
          </p>
        </div>
        <button
          onClick={fetchPendingPayments}
          className="text-slate-400 hover:text-white p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Sync Queue ({orders.length})
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="glass rounded-3xl p-16 border border-slate-800 text-center">
          <ShieldCheck size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-300 font-bold text-sm">All Clear!</h3>
          <p className="text-slate-500 text-xs mt-1">No pending payments require verification right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* List queue */}
          <div className="lg:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Pending verification list</h3>
            {orders.map(o => {
              const expectedAmt = Number((o.totalAmount * 1.05).toFixed(2));
              const isMatch = o.ocrResult.validationStatus === 'LIKELY_VALID';
              
              return (
                <div
                  key={o._id}
                  onClick={() => setSelectedOrder(o)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                    selectedOrder?._id === o._id
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                      : 'glass border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-100">{o.orderReference || o.tokenNumber}</span>
                    <span className={`text-[9px] px-2.5 py-0.5 rounded border font-bold flex items-center gap-1 uppercase ${
                      isMatch
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {isMatch ? <CheckCircle size={8} /> : <AlertCircle size={8} />}
                      {isMatch ? 'Likely Valid' : 'Review'}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400">Student: <span className="font-semibold text-slate-200">{o.userId?.name}</span></p>
                    <p className="text-[10px] text-slate-400">Total payable: <span className="font-bold text-amber-500">₹{expectedAmt}</span></p>
                    <p className="text-[9px] text-slate-500 font-mono mt-1 shrink-0 truncate">ID: {o.transactionId}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Details pane */}
          {selectedOrder && (
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 glass rounded-3xl border border-slate-800 p-6">
              
              {/* Left side: Screenshot preview */}
              <div className="space-y-3">
                <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Deposited Screenshot</h4>
                
                <div className="relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center aspect-[3/4] max-h-[450px]">
                  <img
                    src={`${IMAGE_BASE_URL}${selectedOrder.paymentScreenshot}`}
                    alt="Payment receipt screenshot"
                    className={`object-contain w-full h-full select-none transition-transform duration-300 ${zoomScreenshot ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}`}
                    onClick={() => setZoomScreenshot(!zoomScreenshot)}
                  />
                  <div className="absolute bottom-3 right-3 bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300 px-2 py-1 rounded-lg flex items-center gap-1 pointer-events-none group-hover:opacity-100 opacity-60 transition-opacity">
                    <ZoomIn size={10} /> Click to zoom
                  </div>
                </div>
              </div>

              {/* Right side: OCR comparison & Actions */}
              <div className="flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div>
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Student Information</h4>
                    <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 space-y-1.5 text-xs text-slate-300">
                      <p><strong>Name:</strong> {selectedOrder.userId?.name}</p>
                      <p><strong>Roll/ID:</strong> {selectedOrder.userId?.studentId || 'N/A'}</p>
                      <p><strong>Dept:</strong> {selectedOrder.userId?.department || 'N/A'}</p>
                      <p><strong>Phone:</strong> {selectedOrder.userId?.phone || 'N/A'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">OCR Verification Results</h4>
                    
                    <div className="space-y-3">
                      {/* Amount validation */}
                      <div className="flex justify-between items-center bg-slate-950/30 border border-slate-900 rounded-xl p-3">
                        <div className="text-xs">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Amount Comparison</p>
                          <p className="text-slate-400 mt-1">Expected: <strong className="text-slate-200">₹{Number((selectedOrder.totalAmount * 1.05).toFixed(2))}</strong></p>
                          <p className="text-slate-400">OCR Extracted: <strong className="text-slate-200">₹{selectedOrder.ocrResult.extractedAmount}</strong></p>
                        </div>
                        {Number((selectedOrder.totalAmount * 1.05).toFixed(2)) === selectedOrder.ocrResult.extractedAmount ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">Match</span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">Mismatch</span>
                        )}
                      </div>

                      {/* Payee UPI ID validation */}
                      <div className="flex justify-between items-center bg-slate-950/30 border border-slate-900 rounded-xl p-3">
                        <div className="text-xs">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Merchant UPI ID</p>
                          <p className="text-slate-400 mt-1 shrink-0 truncate max-w-[200px]" title={selectedOrder.ocrResult.extractedUpiId}>
                            Extracted: <strong className="text-slate-200">{selectedOrder.ocrResult.extractedUpiId}</strong>
                          </p>
                        </div>
                        {selectedOrder.ocrResult.extractedUpiId.toLowerCase().includes('wrong') ? (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">Mismatch</span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">Match</span>
                        )}
                      </div>

                      {/* Info logs */}
                      <div className="bg-slate-950/20 border border-slate-900 rounded-xl p-3 text-[10px] text-slate-500 space-y-1 font-mono">
                        <p><strong>Merchant Name:</strong> {selectedOrder.ocrResult.extractedPayeeName}</p>
                        <p><strong>Transaction Ref:</strong> {selectedOrder.ocrResult.extractedTransactionId}</p>
                        <p><strong>Extracted Date:</strong> {selectedOrder.ocrResult.extractedDate} at {selectedOrder.ocrResult.extractedTime}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Approve/Reject Buttons */}
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actioning}
                      className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold py-3 rounded-xl border border-red-500/20 hover:border-transparent transition-all flex items-center justify-center gap-1.5 text-xs active:scale-95"
                    >
                      <XCircle size={14} /> Reject Deposit
                    </button>
                    <button
                      onClick={() => handleApprove(selectedOrder._id)}
                      disabled={actioning}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs"
                    >
                      <CheckCircle size={14} /> Approve Payment
                    </button>
                  </div>
                  
                  <p className="text-[9px] text-slate-500 text-center leading-relaxed">
                    Approving triggers order status transition to **PAID**, assigns pickup token, notifies student, and live-emits order to the Canteen Kitchen queue.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleRejectSubmit} className="glass rounded-3xl border border-slate-800 p-6 max-w-md w-full space-y-4 animate-scaleUp">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Info size={16} className="text-red-400" /> Reject Payment Verification
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Please provide a brief reason for rejecting the payment for order <strong>{selectedOrder.orderReference || selectedOrder.tokenNumber}</strong>. The student will be notified.
            </p>

            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Transaction reference is fake, or payment amount is incorrect."
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-red-500 rounded-xl py-3 px-4 text-xs text-slate-200 focus:outline-none transition-colors h-24 resize-none"
              required
            />

            <div className="flex gap-3 justify-end text-xs font-bold">
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actioning || !rejectReason.trim()}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl transition-all flex items-center gap-1.5"
              >
                Reject Order Payment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
