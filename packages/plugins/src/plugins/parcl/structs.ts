import {
  BeetStruct,
  u8,
  uniformFixedSizeArray,
} from '@metaplex-foundation/beet';
import { publicKey } from '@metaplex-foundation/beet-solana';
import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { blob, u64 } from '../../utils/solana';

export type LpAccount = {
  buffer: Buffer;
  liquidity: BigNumber;
  shares: BigNumber;
  lastAddLiquidityTimestamp: BigNumber;
  exchange: PublicKey;
  owner: PublicKey;
  delegate: PublicKey;
  bump: number;
  padding: number[];
};

export const lpAccountStruct = new BeetStruct<LpAccount>(
  [
    ['buffer', blob(8)],
    ['liquidity', u64],
    ['shares', u64],
    ['lastAddLiquidityTimestamp', u64],
    ['exchange', publicKey],
    ['owner', publicKey],
    ['delegate', publicKey],
    ['bump', u8],
    ['padding', uniformFixedSizeArray(u8, 7)],
  ],
  (args) => args as LpAccount
);

export type LpPosition = {
  buffer: Buffer;
  id: BigNumber;
  liquidity: BigNumber;
  shares: BigNumber;
  maturity: BigNumber;
  exchange: PublicKey;
  owner: PublicKey;
  bump: number;
  padding: number[];
};

export const lpPositionStruct = new BeetStruct<LpPosition>(
  [
    ['buffer', blob(8)],
    ['id', u64],
    ['liquidity', u64],
    ['shares', u64],
    ['maturity', u64],
    ['exchange', publicKey],
    ['owner', publicKey],
    ['bump', u8],
    ['padding', uniformFixedSizeArray(u8, 7)],
  ],
  (args) => args as LpPosition
);

export type SettlementRequest = {
  buffer: Buffer;
  id: BigNumber;
  maturity: BigNumber;
  amount: BigNumber;
  keeperTip: BigNumber;
  exchange: PublicKey;
  owner: PublicKey;
  ownerTokenAccount: PublicKey;
  bump: Buffer;
};

export const settlementRequestStruct = new BeetStruct<SettlementRequest>(
  [
    ['buffer', blob(8)],
    ['id', u64],
    ['maturity', u64],
    ['amount', u64],
    ['keeperTip', u64],
    ['exchange', publicKey],
    ['owner', publicKey],
    ['ownerTokenAccount', publicKey],
    ['bump', blob(8)],
  ],
  (args) => args as SettlementRequest
);
