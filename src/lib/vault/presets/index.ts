/**
 * Vault Presets - Factory functions for all vault types
 */

export { familyPreset, type FamilyPresetInput } from './family';
export { companyPreset, type CompanyPresetInput } from './company';
export { escrowPreset, type EscrowPresetInput } from './escrow';
export { inheritancePreset, type InheritancePresetInput } from './inheritance';
export { daoPreset, type DaoPresetInput } from './dao';
export { tradePreset, type TradePresetInput } from './trade';

import type { VaultType } from '../types';

export const VAULT_TYPE_INFO: Record<VaultType, {
  name: string;
  description: string;
  icon: string;
  color: string;
  minMembers: number;
  maxMembers: number;
  defaultThreshold: string;
}> = {
  family: {
    name: 'Family Wallet',
    description: 'Child + 2 parents. Child requests, parents approve spending.',
    icon: 'Users',
    color: 'blue',
    minMembers: 3,
    maxMembers: 3,
    defaultThreshold: '2-of-3',
  },
  company: {
    name: 'Company Treasury',
    description: 'Multi-signer corporate vault with tiered approvals and auto-approve.',
    icon: 'Building2',
    color: 'emerald',
    minMembers: 2,
    maxMembers: 20,
    defaultThreshold: 'Majority',
  },
  escrow: {
    name: 'Escrow Protocol',
    description: 'Client + Freelancer + Arbiter. Milestone-based releases with dispute resolution.',
    icon: 'Shield',
    color: 'purple',
    minMembers: 3,
    maxMembers: 3,
    defaultThreshold: '2-of-3',
  },
  inheritance: {
    name: 'Inheritance Vault',
    description: 'Dead man\'s switch. Owner heartbeat or executor activates for beneficiary.',
    icon: 'Heart',
    color: 'rose',
    minMembers: 3,
    maxMembers: 3,
    defaultThreshold: '2-of-3',
  },
  dao: {
    name: 'DAO Treasury',
    description: 'Council governance with proposals, voting periods, and quorum.',
    icon: 'Vote',
    color: 'amber',
    minMembers: 3,
    maxMembers: 50,
    defaultThreshold: '60% council',
  },
  trade: {
    name: 'Trade Settlement',
    description: 'Importer + Exporter + Bank. Multi-asset with document verification.',
    icon: 'Globe',
    color: 'cyan',
    minMembers: 3,
    maxMembers: 3,
    defaultThreshold: '2-of-3',
  },
};
