'use client';

import { Users, Building2, Shield, Heart, Vote, Globe } from 'lucide-react';

const icons: Record<string, typeof Users> = {
  family: Users,
  company: Building2,
  escrow: Shield,
  inheritance: Heart,
  dao: Vote,
  trade: Globe,
};

const colors: Record<string, string> = {
  family: 'text-blue-400',
  company: 'text-emerald-400',
  escrow: 'text-purple-400',
  inheritance: 'text-rose-400',
  dao: 'text-amber-400',
  trade: 'text-cyan-400',
};

const gradients: Record<string, string> = {
  family: 'from-blue-500/20 to-blue-600/10 border-blue-500/10',
  company: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/10',
  escrow: 'from-purple-500/20 to-purple-600/10 border-purple-500/10',
  inheritance: 'from-rose-500/20 to-rose-600/10 border-rose-500/10',
  dao: 'from-amber-500/20 to-amber-600/10 border-amber-500/10',
  trade: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/10',
};

export function VaultTypeIcon({
  type,
  size = 20,
  withBg = false,
}: {
  type: string;
  size?: number;
  withBg?: boolean;
}) {
  const Icon = icons[type] || Shield;
  const color = colors[type] || 'text-indigo-400';

  if (withBg) {
    const grad = gradients[type] || 'from-indigo-500/20 to-violet-500/10 border-indigo-500/10';
    return (
      <div className={`bg-gradient-to-br ${grad} border p-2.5 rounded-xl ${color}`}>
        <Icon size={size} />
      </div>
    );
  }

  return <Icon size={size} className={color} />;
}
