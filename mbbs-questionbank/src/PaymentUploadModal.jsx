import React, { useState } from 'react';
import { supabase } from './supabase'; // Adjust path
import { Upload, Check, Loader2, X } from 'lucide-react';

const PaymentUploadModal = ({ user, planName, price, onClose }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  // YOUR FPS INFO
  const FPS_ID = "107937971"; 
  const BANK_NAME = "BOCHK";
  const ACC_NAME = "Chan Hxx Yxx";

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    setUploading(true);

    try {
      // 1. Upload Image
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // 3. Insert DB Record
      const { error: dbError } = await supabase
        .from('payment_submissions')
        .insert({
          user_id: user.id,
          amount: price,
          plan_tier: 'standard',
          proof_url: publicUrl,
          status: 'pending'
        });

      if (dbError) throw dbError;

      setSuccess(true);
      setTimeout(onClose, 3000); 
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-xl flex flex-col items-center animate-in zoom-in">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Submission Received!</h2>
          <p className="text-gray-500 mt-2 text-center">We will verify your payment shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Pay via FPS</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600"/></button>
        </div>

        <div className="p-6 overflow-y-auto">
          
          {/* Step 1: Payment Info (UPDATED LAYOUT) */}
          <div className="bg-slate-800 text-white p-4 rounded-lg mb-6">
            <div className="flex items-center gap-4">
              {/* Image Section: Small, with white bg to pop */}
              <div className="shrink-0 bg-white p-1 rounded-md">
                <img 
                  className="w-20 h-20 object-contain" 
                  src="/fps.jpeg" 
                  alt="FPS Logo"
                />
              </div>

              {/* Text Section: Beside the image */}
              <div className="flex flex-col text-left">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">
                  Send Payment To
                </p>
                <div className="text-xl font-mono font-bold text-teal-400 leading-tight mb-1">
                  FPS: {FPS_ID}
                </div>
                <div className="text-xs text-slate-400">
                  {BANK_NAME} - {ACC_NAME}
                </div>
              </div>
            </div>

            {/* Price Divider */}
            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center text-sm">
              <span>Amount to transfer:</span>
              <span className="font-bold text-lg text-white">${price} HKD</span>
            </div>
          </div>

          {/* Step 2: Upload */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Upload Receipt Proof</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileSelect} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {preview ? (
                <div className="relative h-40 mx-auto">
                   <img src={preview} alt="Proof" className="h-full mx-auto object-contain rounded" />
                   <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold opacity-0 hover:opacity-100 transition-opacity rounded">Change Image</div>
                </div>
              ) : (
                <div className="py-8">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click or Drag screenshot here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button 
            onClick={handleSubmit} 
            disabled={!file || uploading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {uploading ? <Loader2 className="animate-spin w-5 h-5"/> : <Check className="w-5 h-5" />}
            {uploading ? "Uploading..." : "Submit Payment Proof"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentUploadModal;