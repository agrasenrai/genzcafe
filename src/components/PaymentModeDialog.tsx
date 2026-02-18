'use client';

import { useState } from 'react';

interface PaymentModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (paymentMethod: 'cash' | 'upi' | 'card') => void;
  isLoading?: boolean;
}

export default function PaymentModeDialog({
  isOpen,
  onClose,
  onSelect,
  isLoading = false
}: PaymentModeDialogProps) {
  const [selectedMode, setSelectedMode] = useState<'cash' | 'upi' | 'card' | null>(null);

  const paymentModes = [
    {
      id: 'cash',
      name: 'Cash',
      icon: '💵',
      description: 'Payment on pickup',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      id: 'upi',
      name: 'UPI',
      icon: '📱',
      description: 'UPI Payment',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      id: 'card',
      name: 'Card',
      icon: '💳',
      description: 'Credit/Debit Card',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Select Payment Mode</h2>
          <p className="text-sm text-gray-600 mt-1">Choose how the customer will pay for this order</p>
        </div>

        <div className="px-6 py-4">
          <div className="space-y-3">
            {paymentModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id as 'cash' | 'upi' | 'card')}
                disabled={isLoading}
                className={`w-full p-4 border-2 rounded-lg font-medium transition-all text-left ${
                  selectedMode === mode.id
                    ? `border-current ${mode.color}`
                    : `border-gray-200 ${mode.color}`
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{mode.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{mode.name}</div>
                    <div className="text-xs text-gray-600">{mode.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex gap-3 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedMode) {
                onSelect(selectedMode);
                setSelectedMode(null);
              }
            }}
            disabled={!selectedMode || isLoading}
            className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
