import {
  BeetStruct,
  FixableBeetStruct,
  bool,
  i32,
  u16,
  u32,
  u8,
  uniformFixedSizeArray,
} from '@metaplex-foundation/beet';
import BigNumber from 'bignumber.js';
import { publicKey } from '@metaplex-foundation/beet-solana';
import { PublicKey } from '@solana/web3.js';
import { blob, i64, u128, u64 } from '../../utils/solana';

export type VaultBumps = {
  vaultBump: number;
  tokenVaultBump: number;
};
export const vaultBumpsStruct = new BeetStruct<VaultBumps>(
  [
    ['vaultBump', u8],
    ['tokenVaultBump', u8],
  ],
  (args) => args as VaultBumps
);

export type LockedProfitTracker = {
  lastUpdatedLockedProfit: BigNumber;
  lastReport: BigNumber;
  lockedProfitDegradation: BigNumber;
};
export const lockedProfitTrackerStruct = new BeetStruct<LockedProfitTracker>(
  [
    ['lastUpdatedLockedProfit', u64],
    ['lastReport', u64],
    ['lockedProfitDegradation', u64],
  ],
  (args) => args as LockedProfitTracker
);

export type Vault = {
  buffer: Buffer;
  /// The flag, if admin set enable = false, then the user can only withdraw and cannot deposit in the vault.
  enabled: number;
  /// Vault nonce, to create vault seeds
  bumps: VaultBumps;
  /// The total liquidity of the vault, including remaining tokens in token_vault and the liquidity in all strategies.
  total_amount: BigNumber;
  /// Token account, hold liquidity in vault reserve
  token_vault: PublicKey;
  /// Hold lp token of vault, each time rebalance crank is called, vault calculate performance fee and mint corresponding lp token amount to fee_vault. fee_vault is owned by treasury address
  fee_vault: PublicKey;
  /// Token mint that vault supports
  token_mint: PublicKey;
  /// Lp mint of vault
  lp_mint: PublicKey;
  /// The list of strategy addresses that vault supports, vault can support up to MAX_STRATEGY strategies at the same time.
  strategies: PublicKey[];
  /// The base address to create vault seeds
  base: PublicKey;
  /// Admin of vault
  admin: PublicKey;
  /// Person who can send the crank. Operator can only send liquidity to strategies that admin defined, and claim reward to account of treasury address
  operator: PublicKey;
  /// Stores information for locked profit.
  locked_profit_tracker: LockedProfitTracker;
};

export const vaultStruct = new BeetStruct<Vault>(
  [
    ['buffer', blob(8)],
    ['enabled', u8],
    ['bumps', vaultBumpsStruct],
    ['total_amount', u64],
    ['token_vault', publicKey],
    ['fee_vault', publicKey],
    ['token_mint', publicKey],
    ['lp_mint', publicKey],
    ['strategies', uniformFixedSizeArray(publicKey, 30)],
    ['base', publicKey],
    ['admin', publicKey],
    ['operator', publicKey],
    ['locked_profit_tracker', lockedProfitTrackerStruct],
  ],
  (args) => args as Vault
);

export type Padding = {
  padding0: number[];
  padding: BigNumber[];
};

export const paddingStruct = new FixableBeetStruct<Padding>(
  [
    ['padding0', uniformFixedSizeArray(u8, 15)],
    ['padding', uniformFixedSizeArray(u128, 29)],
  ],
  (args) => args as Padding
);

export enum DepegType {
  None,
  Marinade,
  Lido,
  SplStake,
}

export type Depeg = {
  baseVirtualPrice: BigNumber;
  baseCacheUpdated: BigNumber;
  depegType: DepegType;
};

export const depegStruct = new BeetStruct<Depeg>(
  [
    ['baseVirtualPrice', u64],
    ['baseCacheUpdated', u64],
    ['depegType', u8],
  ],
  (args) => args as Depeg
);

export type TokenMultiplier = {
  tokenAMultiplier: BigNumber;
  tokenBMultiplier: BigNumber;
  precisionFactor: number;
};

export const TokenMultiplierStruct = new BeetStruct<TokenMultiplier>(
  [
    ['tokenAMultiplier', u64],
    ['tokenBMultiplier', u64],
    ['precisionFactor', u8],
  ],
  (args) => args as TokenMultiplier
);

export type StableParams = {
  amp: BigNumber;
  token_multiplier: TokenMultiplier;
  depeg: Depeg;
  last_amp_updated_timestamp: BigNumber;
};

export const stableParamsStruct = new BeetStruct<StableParams>(
  [
    ['amp', u64],
    ['token_multiplier', TokenMultiplierStruct],
    ['depeg', depegStruct],
    ['last_amp_updated_timestamp', u64],
  ],
  (args) => args as StableParams
);

export enum CurveType {
  ConstantProduct,
  Stable,
}

export enum PoolType {
  Permissioned,
  Permissionless,
}

export type PoolFees = {
  tradeFeeNumerator: BigNumber;
  tradeFeeDenominator: BigNumber;
  ownerTradeFeeNumerator: BigNumber;
  ownerTradeFeeDenominator: BigNumber;
};

export const poolFeesStruct = new BeetStruct<PoolFees>(
  [
    ['tradeFeeNumerator', u64],
    ['tradeFeeDenominator', u64],
    ['ownerTradeFeeNumerator', u64],
    ['ownerTradeFeeDenominator', u64],
  ],
  (args) => args as PoolFees
);

export type PoolState = {
  buffer: Buffer;
  lpMint: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  aVault: PublicKey;
  bVault: PublicKey;
  aVaultLp: PublicKey;
  bVaultLp: PublicKey;
  aVaultLpBump: number;
  enabled: boolean;
  adminTokenAFee: PublicKey;
  adminTokenBFee: PublicKey;
  admin: PublicKey;
  fees: PoolFees;
  poolType: PoolType;
  stake: PublicKey;
  padding: Padding;
  curveType: CurveType;
};

export const poolStateStruct = new FixableBeetStruct<PoolState>(
  [
    ['buffer', blob(8)],
    ['lpMint', publicKey],
    ['tokenAMint', publicKey],
    ['tokenBMint', publicKey],
    ['aVault', publicKey],
    ['bVault', publicKey],
    ['aVaultLp', publicKey],
    ['bVaultLp', publicKey],
    ['aVaultLpBump', u8],
    ['enabled', bool],
    ['adminTokenAFee', publicKey],
    ['adminTokenBFee', publicKey],
    ['admin', publicKey],
    ['fees', poolFeesStruct],
    ['poolType', u8],
    ['stake', publicKey],
    ['padding', paddingStruct],
    ['curveType', u8],
  ],
  (args) => args as PoolState
);

export type Farm = {
  buffer: Buffer;
  authority: PublicKey;
  paused: boolean;
  stakingMint: PublicKey;
  stakingVault: PublicKey;
  rewardAMint: PublicKey;
  rewardAVault: PublicKey;
  rewardBMint: PublicKey;
  rewardBVault: PublicKey;
  rewardDuration: BigNumber;
  rewardDurationEnd: BigNumber;
  lastUpdateTime: BigNumber;
  rewardARate: BigNumber;
  rewardBRate: BigNumber;
  rewardAPerTokenStored: BigNumber;
  rewardBPerTokenStored: BigNumber;
  userStakeCount: number;
  funders: PublicKey[];
  rewardARateU128: BigNumber;
  rewardBRateU128: BigNumber;
  poolBump: number;
  totalStaked: BigNumber;
};

export const farmStruct = new BeetStruct<Farm>(
  [
    ['buffer', blob(8)],
    ['authority', publicKey],
    ['paused', bool],
    ['stakingMint', publicKey],
    ['stakingVault', publicKey],
    ['rewardAMint', publicKey],
    ['rewardAVault', publicKey],
    ['rewardBMint', publicKey],
    ['rewardBVault', publicKey],
    ['rewardDuration', u64],
    ['rewardDurationEnd', u64],
    ['lastUpdateTime', u64],
    ['rewardARate', u64],
    ['rewardBRate', u64],
    ['rewardAPerTokenStored', u128],
    ['rewardBPerTokenStored', u128],
    ['userStakeCount', u32],
    ['funders', uniformFixedSizeArray(publicKey, 3)],
    ['rewardARateU128', u128],
    ['rewardBRateU128', u128],
    ['poolBump', u8],
    ['totalStaked', u64],
  ],
  (args) => args as Farm
);

export type FarmAccount = {
  buffer: Buffer;
  pool: PublicKey;
  owner: PublicKey;
  rewardAPerTokenComplete: BigNumber;
  rewardBPerTokenComplete: BigNumber;
  rewardAPerTokenPending: BigNumber;
  rewardBPerTokenPending: BigNumber;
  balanceStaked: BigNumber;
  nonce: number;
};

export const farmAccountStruct = new BeetStruct<FarmAccount>(
  [
    ['buffer', blob(8)],
    ['pool', publicKey],
    ['owner', publicKey],
    ['rewardAPerTokenComplete', u128],
    ['rewardBPerTokenComplete', u128],
    ['rewardAPerTokenPending', u64],
    ['rewardBPerTokenPending', u64],
    ['balanceStaked', u64],
    ['nonce', u8],
  ],
  (args) => args as FarmAccount
);

export type UserRewardInfo = {
  rewardPerTokenCompletesX: BigNumber;
  rewardPerTokenCompletesY: BigNumber;
  rewardPendingsX: BigNumber;
  rewardPendingsY: BigNumber;
};

export const userRewardInfoStruct = new BeetStruct<UserRewardInfo>(
  [
    ['rewardPerTokenCompletesX', u128],
    ['rewardPerTokenCompletesY', u128],
    ['rewardPendingsX', u64],
    ['rewardPendingsY', u64],
  ],
  (args) => args as UserRewardInfo
);

export type FeeInfo = {
  feeXPerTokenComplete: BigNumber;
  feeYPerTokenComplete: BigNumber;
  feeXPending: BigNumber;
  feeYPending: BigNumber;
};

export const feeInfoStruct = new BeetStruct<FeeInfo>(
  [
    ['feeXPerTokenComplete', u128],
    ['feeYPerTokenComplete', u128],
    ['feeXPending', u64],
    ['feeYPending', u64],
  ],
  (args) => args as FeeInfo
);

export type DLMMPosition = {
  buffer: Buffer;
  lbPair: PublicKey;
  owner: PublicKey;
  liquidityShares: BigNumber[];
  rewardInfos: UserRewardInfo[];
  feeInfos: FeeInfo[];
  lowerBinId: number;
  upperBinId: number;
  lastUpdatedAt: BigNumber;
  totalClaimedFeeXAmount: BigNumber;
  totalClaimedFeeYAmount: BigNumber;
  totalClaimedRewards: BigNumber[];
  reserved: number[];
};

export const dlmmPositionStruct = new BeetStruct<DLMMPosition>(
  [
    ['buffer', blob(8)],
    ['lbPair', publicKey],
    ['owner', publicKey],
    ['liquidityShares', uniformFixedSizeArray(u64, 70)],
    ['rewardInfos', uniformFixedSizeArray(userRewardInfoStruct, 70)],
    ['feeInfos', uniformFixedSizeArray(feeInfoStruct, 70)],
    ['lowerBinId', i32],
    ['upperBinId', i32],
    ['lastUpdatedAt', i64],
    ['totalClaimedFeeXAmount', u64],
    ['totalClaimedFeeYAmount', u64],
    ['totalClaimedRewards', uniformFixedSizeArray(u64, 2)],
    ['reserved', uniformFixedSizeArray(u8, 160)],
  ],
  (args) => args as DLMMPosition
);

export type RewardInfo = {
  mint: PublicKey;
  vault: PublicKey;
  funder: PublicKey;
  rewardDuration: BigNumber;
  rewardDurationEnd: BigNumber;
  rewardRate: BigNumber;
  lastUpdateTime: BigNumber;
  cumulativeSecondsWithEmptyLiquidityReward: BigNumber;
};

export const rewardInfoStruct = new BeetStruct<RewardInfo>(
  [
    ['mint', publicKey],
    ['vault', publicKey],
    ['funder', publicKey],
    ['rewardDuration', u64],
    ['rewardDurationEnd', u64],
    ['rewardRate', u128],
    ['lastUpdateTime', u64],
    ['cumulativeSecondsWithEmptyLiquidityReward', u64],
  ],
  (args) => args as RewardInfo
);

export type ProtocolFee = {
  amountX: BigNumber;
  amountY: BigNumber;
};
export const protocolFeeStruct = new BeetStruct<ProtocolFee>(
  [
    ['amountX', u64],
    ['amountY', u64],
  ],
  (args) => args as ProtocolFee
);

export type StaticParameters = {
  baseFactor: number;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  variableFeeControl: number;
  maxVolatilityAccumulator: number;
  minBinId: number;
  maxBinId: number;
  protocolShare: number;
  padding: number[];
};

export const staticParametersStruct = new BeetStruct<StaticParameters>(
  [
    ['baseFactor', u16],
    ['filterPeriod', u16],
    ['decayPeriod', u16],
    ['reductionFactor', u16],
    ['variableFeeControl', u32],
    ['maxVolatilityAccumulator', u32],
    ['minBinId', i32],
    ['maxBinId', i32],
    ['protocolShare', u16],
    ['padding', uniformFixedSizeArray(u8, 6)],
  ],
  (args) => args as StaticParameters
);

export type VariableParameters = {
  volatilityAccumulator: number;
  volatilityReference: number;
  indexReference: number;
  padding: number[];
  lastUpdateTimestamp: BigNumber;
  padding1: number[];
};

export const variableParametersStruct = new BeetStruct<VariableParameters>(
  [
    ['volatilityAccumulator', u32],
    ['volatilityReference', u32],
    ['indexReference', i32],
    ['padding', uniformFixedSizeArray(u8, 4)],
    ['lastUpdateTimestamp', i64],
    ['padding1', uniformFixedSizeArray(u8, 8)],
  ],
  (args) => args as VariableParameters
);

export type LbPair = {
  buffer: Buffer;
  parameters: StaticParameters;
  vParameters: VariableParameters;
  bumpSeed: number[];
  binStepSeed: number[];
  pairType: number;
  activeId: number;
  binStep: number;
  status: number;
  padding1: number[];
  tokenXMint: PublicKey;
  tokenYMint: PublicKey;
  reserveX: PublicKey;
  reserveY: PublicKey;
  protocolFee: ProtocolFee;
  feeOwner: PublicKey;
  rewardInfos: RewardInfo[];
  oracle: PublicKey;
  binArrayBitmap: BigNumber[];
  lastUpdatedAt: BigNumber;
  whitelistedWallet: PublicKey[];
  baseKey: PublicKey;
  activationSlot: BigNumber;
  swapCapDeactivateSlot: BigNumber;
  maxSwappedAmount: BigNumber;
  reserved: number[];
};

export const lbPairStruct = new BeetStruct<LbPair>(
  [
    ['buffer', blob(8)],
    ['parameters', staticParametersStruct],
    ['vParameters', variableParametersStruct],
    ['bumpSeed', uniformFixedSizeArray(u8, 1)],
    ['binStepSeed', uniformFixedSizeArray(u8, 2)],
    ['pairType', u8],
    ['activeId', i32],
    ['binStep', u16],
    ['status', u8],
    ['padding1', uniformFixedSizeArray(u8, 5)],
    ['tokenXMint', publicKey],
    ['tokenYMint', publicKey],
    ['reserveX', publicKey],
    ['reserveY', publicKey],
    ['protocolFee', protocolFeeStruct],
    ['feeOwner', publicKey],
    ['rewardInfos', uniformFixedSizeArray(rewardInfoStruct, 2)],
    ['oracle', publicKey],
    ['binArrayBitmap', uniformFixedSizeArray(u64, 16)],
    ['lastUpdatedAt', i64],
    ['whitelistedWallet', uniformFixedSizeArray(publicKey, 2)],
    ['baseKey', publicKey],
    ['activationSlot', u64],
    ['swapCapDeactivateSlot', u64],
    ['maxSwappedAmount', u64],
    ['reserved', uniformFixedSizeArray(u8, 64)],
  ],
  (args) => args as LbPair
);

export type Bin = {
  amountX: BigNumber;
  amountY: BigNumber;
  price: BigNumber;
  liquiditySupply: BigNumber;
  rewardPerTokenXStored: BigNumber;
  rewardPerTokenYStored: BigNumber;
  feeAmountXPerTokenStored: BigNumber;
  feeAmountYPerTokenStored: BigNumber;
  amountXIn: BigNumber;
  amountYIn: BigNumber;
};

export const binStruct = new BeetStruct<Bin>(
  [
    ['amountX', u64],
    ['amountY', u64],
    ['price', u128],
    ['liquiditySupply', u128],
    ['rewardPerTokenXStored', u128],
    ['rewardPerTokenYStored', u128],
    ['feeAmountXPerTokenStored', u128],
    ['feeAmountYPerTokenStored', u128],
    ['amountXIn', u128],
    ['amountYIn', u128],
  ],
  (args) => args as Bin
);

export type BinArray = {
  buffer: Buffer;
  index: BigNumber;
  version: number;
  padding: number[];
  lbPair: PublicKey;
  bins: Bin[];
};

export const binArrayStruct = new BeetStruct<BinArray>(
  [
    ['buffer', blob(8)],
    ['index', i64],
    ['version', u8],
    ['padding', uniformFixedSizeArray(u8, 7)],
    ['lbPair', publicKey],
    ['bins', uniformFixedSizeArray(binStruct, 70)],
  ],
  (args) => args as BinArray
);
