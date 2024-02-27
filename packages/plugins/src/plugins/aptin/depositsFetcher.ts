import {
  NetworkId,
  PortfolioAsset,
  PortfolioElement,
  PortfolioElementType,
  TokenPrice,
  Yield,
  formatTokenAddress,
  getElementLendingValues,
} from '@sonarwatch/portfolio-core';
import BigNumber from 'bignumber.js';
import { Cache } from '../../Cache';
import { Fetcher, FetcherExecutor } from '../../Fetcher';
import { configStoresKey, platformId, poolPositionsType } from './constants';
import {
  BorrowPosition,
  ConfigStores,
  PoolPositions,
  SupplyPosition,
} from './types';
import tokenPriceToAssetToken from '../../utils/misc/tokenPriceToAssetToken';
import { getClientAptos } from '../../utils/clients';
import { getAccountResource, getTableItemsByKeys } from '../../utils/aptos';

const executor: FetcherExecutor = async (owner: string, cache: Cache) => {
  const client = getClientAptos();

  const poolPositions = await getAccountResource<PoolPositions>(
    client,
    owner,
    poolPositionsType
  );
  if (!poolPositions) return [];
  if (
    poolPositions.data.supply_coins.length === 0 &&
    poolPositions.data.borrow_coins.length === 0
  )
    return [];

  const configStores = await cache.getItem<ConfigStores>(configStoresKey, {
    prefix: platformId,
    networkId: NetworkId.aptos,
  });
  if (!configStores) return [];

  const supplyPositions =
    poolPositions.data.supply_coins.length === 0
      ? []
      : await getTableItemsByKeys<SupplyPosition>(
          client,
          poolPositions.data.supply_position.handle,
          poolPositions.data.supply_coins,
          '0x1::string::String',
          '0x3c1d4a86594d681ff7e5d5a233965daeabdc6a15fe5672ceeda5260038857183::pool::SupplyPosition'
        );
  const borrowPositions =
    poolPositions.data.borrow_coins.length === 0
      ? []
      : await getTableItemsByKeys<BorrowPosition>(
          client,
          poolPositions.data.borrow_position.handle,
          poolPositions.data.borrow_coins,
          '0x1::string::String',
          '0x3c1d4a86594d681ff7e5d5a233965daeabdc6a15fe5672ceeda5260038857183::pool::BorrowPosition'
        );

  const borrowedAssets: PortfolioAsset[] = [];
  const borrowedYields: Yield[][] = [];
  const suppliedAssets: PortfolioAsset[] = [];
  const suppliedYields: Yield[][] = [];
  const rewardAssets: PortfolioAsset[] = [];
  const suppliedLtvs: number[] = [];

  // Token prices
  const tokenPricesRes = await cache.getTokenPrices(
    [...poolPositions.data.supply_coins, ...poolPositions.data.borrow_coins],
    NetworkId.aptos
  );
  const tokenPrices: Record<string, TokenPrice> = {};
  tokenPricesRes.forEach((tp) => {
    if (!tp) return;
    tokenPrices[tp?.address] = tp;
  });

  for (let i = 0; i < supplyPositions.length; i++) {
    const supplyPosition = supplyPositions[i];
    if (!supplyPosition) continue;
    if (supplyPosition.amount === '0') continue;

    const coinType = poolPositions.data.supply_coins[i];
    const address = formatTokenAddress(coinType, NetworkId.aptos);
    const { decimals, ltv } = configStores[coinType];
    const amount = new BigNumber(supplyPosition.amount)
      .div(10 ** decimals)
      .toNumber();

    suppliedAssets.push(
      tokenPriceToAssetToken(
        coinType,
        amount,
        NetworkId.aptos,
        tokenPrices[address] || undefined
      )
    );
    suppliedLtvs.push(supplyPosition.collateral ? ltv / 100 : 0);
    suppliedYields.push([]);
  }

  for (let i = 0; i < borrowPositions.length; i++) {
    const borrowPosition = borrowPositions[i];
    if (!borrowPosition) continue;
    if (borrowPosition.amount === '0') continue;

    const coinType = poolPositions.data.borrow_coins[i];
    const address = formatTokenAddress(coinType, NetworkId.aptos);
    const { decimals } = configStores[coinType];
    const amount = new BigNumber(borrowPosition.amount)
      .div(10 ** decimals)
      .toNumber();

    borrowedAssets.push(
      tokenPriceToAssetToken(
        coinType,
        amount,
        NetworkId.aptos,
        tokenPrices[address] || undefined
      )
    );
    borrowedYields.push([]);
  }

  const { borrowedValue, healthRatio, suppliedValue, value } =
    getElementLendingValues(
      suppliedAssets,
      borrowedAssets,
      rewardAssets,
      suppliedLtvs
    );

  const element: PortfolioElement = {
    type: PortfolioElementType.borrowlend,
    networkId: NetworkId.aptos,
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
      collateralRatio: null,
      healthRatio,
      rewardAssets,
      value,
    },
  };
  return [element];
};

const fetcher: Fetcher = {
  id: `${platformId}-deposits`,
  networkId: NetworkId.aptos,
  executor,
};

export default fetcher;
