'use client';

import { Check, Clock, Shield, User } from 'lucide-react';

interface Member {
  id: string;
  email: string;
  role: string;
  label: string;
  status: string;
  name?: string;
  image?: string;
  share_index?: number;
}

const roleColors: Record<string, string> = {
  owner: 'text-amber-400',
  signer: 'text-blue-400',
  requester: 'text-emerald-400',
  viewer: 'text-zinc-400',
  executor: 'text-rose-400',
  beneficiary: 'text-purple-400',
  arbiter: 'text-cyan-400',
  council: 'text-indigo-400',
};

export function MemberList({ members }: { members: Member[] }) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div key={member.id} className="inner-panel flex items-center justify-between py-2.5 px-3">
          <div className="flex items-center gap-3">
            {member.image ? (
              <img src={member.image} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-e)' }}>
                <User size={14} style={{ color: 'var(--text-t)' }} />
              </div>
            )}
            <div>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{member.name || member.email}</p>
              {member.label && <p className="text-xs" style={{ color: 'var(--text-t)' }}>{member.label}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium inner-panel ${roleColors[member.role] || ''}`}>
              {member.role}
            </span>
            {member.status === 'accepted' ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Clock size={14} className="text-amber-400" />
            )}
            {member.share_index && (
              <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--text-t)' }}>
                <Shield size={10} />#{member.share_index}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
