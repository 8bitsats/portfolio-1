import { NetworkIdType } from '../Network';

export type LlamaProtocolFull = {
  id: string;
  name: string;
  address: null | string;
  symbol: string;
  url: string;
  description: null | string;
  chain: string;
  logo: string;
  audits: null | string;
  audit_note?: null | string;
  gecko_id: null | string;
  cmcId: null | string;
  category: string;
  chains: string[];
  module: string;
  twitter?: null | string;
  forkedFrom?: string[];
  oracles?: string[];
  listedAt?: number;
  slug: string;
  tvl: number;
  chainTvls: { [key: string]: number };
  change_1h: number | null;
  change_1d: number | null;
  change_7d: number | null;
  mcap: number | null;
  referralUrl?: string;
  treasury?: string;
  audit_links?: string[];
  openSource?: boolean;
  governanceID?: string[];
  github?: string[];
  stablecoins?: string[];
  parentProtocol?: string;
  wrongLiquidity?: boolean;
  staking?: number;
  pool2?: number;
  language?: string;
  assetToken?: string;
  oraclesByChain?: { [key: string]: string[] };
  deadUrl?: boolean;
  rugged?: boolean;
};

export type LlamaProtocol = {
  id: string;
  name: string;
  url: string;
  logo: string;
  twitter?: null | string;
  slug: string;
  tvl: number;
  openSource?: boolean;
  deadUrl?: boolean;
  rugged?: boolean;
  networkIds: NetworkIdType[];
  categories: string[];
};
