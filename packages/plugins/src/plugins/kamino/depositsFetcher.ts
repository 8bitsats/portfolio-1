import {
  NetworkId,
  PortfolioAsset,
  PortfolioElement,
  PortfolioElementType,
  TokenPrice,
  Yield,
  aprToApy,
  getElementLendingValues,
} from '@sonarwatch/portfolio-core';
import BigNumber from 'bignumber.js';
import { platformId, reservesKey } from './constants';
import { Fetcher, FetcherExecutor } from '../../Fetcher';
import { Cache } from '../../Cache';
import { getClientSolana } from '../../utils/clients';
import { obligationStruct } from './structs/klend';
import { getParsedAccountInfo } from '../../utils/solana/getParsedAccountInfo';
import tokenPriceToAssetToken from '../../utils/misc/tokenPriceToAssetToken';
import { ReserveDataEnhanced } from './types';
import { getParsedMultipleAccountsInfo } from '../../utils/solana';
import { getLendingPda, getMultiplyPdas } from './helpers';

const executor: FetcherExecutor = async (owner: string, cache: Cache) => {
  const client = getClientSolana();
  const networkId = NetworkId.solana;

  const lendingAccount = await getParsedAccountInfo(
    client,
    obligationStruct,
    getLendingPda(owner)
  );

  const multiplyAccounts = await getParsedMultipleAccountsInfo(
    client,
    obligationStruct,
    getMultiplyPdas(owner)
  );

  if (!lendingAccount && !multiplyAccounts) return [];

  const reserves = await cache.getItem<Record<string, ReserveDataEnhanced>>(
    reservesKey,
    {
      prefix: platformId,
      networkId,
    }
  );
  if (!reserves) return [];

  const tokenAddresses = Object.entries(reserves).map((entry) =>
    reserves[entry[0]].liquidity.mintPubkey.toString()
  );

  const tokensPrices = await cache.getTokenPrices(tokenAddresses, networkId);
  const tokenPriceById: Map<string, TokenPrice> = new Map();
  tokensPrices.forEach((tP) => (tP ? tokenPriceById.set(tP.address, tP) : []));

  const elements: PortfolioElement[] = [];

  // *************
  // KLend : https://app.kamino.finance/lending
  // *************

  if (lendingAccount) {
    const borrowedAssets: PortfolioAsset[] = [];
    const borrowedYields: Yield[][] = [];
    const suppliedAssets: PortfolioAsset[] = [];
    const suppliedYields: Yield[][] = [];
    const rewardAssets: PortfolioAsset[] = [];
    const suppliedLtvs: number[] = [];
    const borrowedWeights: number[] = [];
    for (const deposit of lendingAccount.deposits) {
      if (
        deposit.depositReserve.toString() ===
          '11111111111111111111111111111111' ||
        deposit.depositedAmount.isLessThanOrEqualTo(0)
      )
        continue;

      const amountRaw = deposit.depositedAmount;
      const reserve = reserves[deposit.depositReserve.toString()];
      if (!reserve) continue;

      const mint = reserve.liquidity.mintPubkey;
      const tokenPrice = tokenPriceById.get(mint);
      const amount = amountRaw
        .dividedBy(new BigNumber(10).pow(reserve.liquidity.mintDecimals))
        .toNumber();
      suppliedAssets.push(
        tokenPriceToAssetToken(mint, amount, networkId, tokenPrice)
      );
      suppliedLtvs.push(reserve.config.loanToValuePct / 100);
      suppliedYields.push([
        { apr: reserve.supplyApr, apy: aprToApy(reserve.supplyApr) },
      ]);
    }

    for (const borrow of lendingAccount.borrows) {
      if (
        borrow.borrowReserve.toString() ===
          '11111111111111111111111111111111' ||
        borrow.borrowedAmountSf.isLessThanOrEqualTo(0)
      )
        continue;

      const amountRaw = borrow.borrowedAmountSf.dividedBy(
        borrow.cumulativeBorrowRateBsf.value0
      );
      const reserve = reserves[borrow.borrowReserve.toString()];
      if (!reserve) continue;

      const mint = reserve.liquidity.mintPubkey;
      const tokenPrice = tokenPriceById.get(mint);
      const amount = amountRaw
        .dividedBy(new BigNumber(10).pow(reserve.liquidity.mintDecimals))
        .toNumber();
      borrowedAssets.push(
        tokenPriceToAssetToken(mint, amount, networkId, tokenPrice)
      );
      borrowedWeights.push(Number(reserve.config.borrowFactorPct) / 100);
      borrowedYields.push([
        { apr: reserve.borrowApr, apy: aprToApy(reserve.borrowApr) },
      ]);
    }

    if (suppliedAssets.length !== 0 && borrowedAssets.length !== 0) {
      const {
        borrowedValue,
        collateralRatio,
        suppliedValue,
        value,
        healthRatio,
      } = getElementLendingValues(
        suppliedAssets,
        borrowedAssets,
        rewardAssets,
        suppliedLtvs,
        borrowedWeights
      );

      elements.push({
        type: PortfolioElementType.borrowlend,
        networkId,
        platformId,
        label: 'Lending',
        value,
        data: {
          borrowedAssets,
          borrowedValue,
          borrowedYields,
          suppliedAssets,
          suppliedValue,
          suppliedYields,
          collateralRatio,
          healthRatio,
          rewardAssets,
          value,
        },
      });
    }
  }

  // ******
  // Multiply :  https://app.kamino.finance/lending/multiply
  // ******

  for (const multiplyAccount of multiplyAccounts) {
    if (!multiplyAccount) continue;

    const borrowedAssets: PortfolioAsset[] = [];
    const borrowedYields: Yield[][] = [];
    const suppliedAssets: PortfolioAsset[] = [];
    const suppliedYields: Yield[][] = [];
    const rewardAssets: PortfolioAsset[] = [];
    const suppliedLtvs: number[] = [];
    const borrowedWeights: number[] = [];

    for (const deposit of multiplyAccount.deposits) {
      if (
        deposit.depositReserve.toString() ===
          '11111111111111111111111111111111' ||
        deposit.depositedAmount.isLessThanOrEqualTo(0)
      )
        continue;

      const amountRaw = deposit.depositedAmount;
      const reserve = reserves[deposit.depositReserve.toString()];
      if (!reserve) continue;

      const mint = reserve.liquidity.mintPubkey;
      const tokenPrice = tokenPriceById.get(mint);
      const amount = amountRaw
        .dividedBy(new BigNumber(10).pow(reserve.liquidity.mintDecimals))
        .toNumber();
      suppliedAssets.push(
        tokenPriceToAssetToken(mint, amount, networkId, tokenPrice)
      );
      suppliedLtvs.push(reserve.config.loanToValuePct / 100);
      suppliedYields.push([
        { apr: reserve.supplyApr, apy: aprToApy(reserve.supplyApr) },
      ]);
    }

    for (const borrow of multiplyAccount.borrows) {
      if (
        borrow.borrowReserve.toString() ===
          '11111111111111111111111111111111' ||
        borrow.borrowedAmountSf.isLessThanOrEqualTo(0)
      )
        continue;

      const amountRaw = borrow.borrowedAmountSf.dividedBy(
        borrow.cumulativeBorrowRateBsf.value0
      );
      const reserve = reserves[borrow.borrowReserve.toString()];
      if (!reserve) continue;

      const mint = reserve.liquidity.mintPubkey;
      const tokenPrice = tokenPriceById.get(mint);
      const amount = amountRaw
        .dividedBy(new BigNumber(10).pow(reserve.liquidity.mintDecimals))
        .toNumber();
      borrowedAssets.push(
        tokenPriceToAssetToken(mint, amount, networkId, tokenPrice)
      );
      borrowedWeights.push(Number(reserve.config.borrowFactorPct) / 100);
      borrowedYields.push([
        { apr: reserve.borrowApr, apy: aprToApy(reserve.borrowApr) },
      ]);
    }

    if (suppliedAssets.length !== 0 && borrowedAssets.length !== 0) {
      const {
        borrowedValue,
        collateralRatio,
        suppliedValue,
        value,
        healthRatio,
      } = getElementLendingValues(
        suppliedAssets,
        borrowedAssets,
        rewardAssets,
        suppliedLtvs,
        borrowedWeights
      );

      elements.push({
        type: PortfolioElementType.borrowlend,
        networkId,
        platformId,
        label: 'Lending',
        name: 'Multiply',
        value,
        data: {
          borrowedAssets,
          borrowedValue,
          borrowedYields,
          suppliedAssets,
          suppliedValue,
          suppliedYields,
          collateralRatio,
          healthRatio,
          rewardAssets,
          value,
        },
      });
    }
  }
  return elements;
};

const fetcher: Fetcher = {
  id: `${platformId}-deposits`,
  networkId: NetworkId.solana,
  executor,
};

export default fetcher;
