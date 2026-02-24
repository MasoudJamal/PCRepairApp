"use client";

import {
  Building,
  MapPin,
  Phone,
  Percent,
  Globe,
  DollarSign,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

interface ShowroomDetailsCardProps {
  showroom: {
    name: string;
    address: string | null;
    phone: string | null;
    markup_percent: number;
    currency_code: string;
    balance: number;
    notes: string | null;
    logo_url: string | null;
  };
}

export default function ShowroomDetailsCard({ showroom }: ShowroomDetailsCardProps) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-xl">
      {/* Logo Section */}
      <div className="mb-8 pb-6 border-b border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Showroom Logo
        </h3>

        <div className="aspect-square max-w-[220px] bg-gray-900 border-2 border-gray-700 rounded-xl overflow-hidden">
          {showroom.logo_url ? (
            <img
              src={showroom.logo_url}
              alt="Showroom logo"
              className="w-full h-full object-contain p-4"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
              <ImageIcon className="h-12 w-12 mb-2" />
              <p className="text-xs">No logo</p>
            </div>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Building className="h-4 w-4" />
            Showroom Name
          </label>
          <div className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white">
            {showroom.name}
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </label>
          <div className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-300">
            {showroom.address || "—"}
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone
          </label>
          <div
            className={`px-4 py-3 bg-gray-900 border rounded-xl ${
              showroom.phone ? "border-gray-700 text-gray-300" : "border-red-500/40 text-red-400"
            }`}
          >
            {showroom.phone || "Missing"}
          </div>
        </div>

        {/* Markup */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Markup
          </label>
          <div className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white">
            {showroom.markup_percent}%
          </div>
        </div>

        {/* Balance */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Balance
          </label>
          <div className="relative">
            <div className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-300">
              {showroom.balance.toFixed(3)}
            </div>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {showroom.currency_code}
            </span>
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Currency
          </label>
          <div className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white">
            {showroom.currency_code}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6 pt-6 border-t border-gray-700/50">
        <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4" />
          Notes
        </label>
        <div className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-300 whitespace-pre-wrap">
          {showroom.notes || "—"}
        </div>
      </div>
    </div>
  );
}
