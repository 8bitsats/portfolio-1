import { StaticJsonRpcProvider } from '@ethersproject/providers';
import 'reflect-metadata';
import {
  UiIncentiveDataProvider,
  UiPoolDataProvider,
} from '@aave/contract-helpers';
import { formatReservesAndIncentives } from '@aave/math-utils';
import { Cache } from '../../Cache';
import { Job, JobExecutor } from '../../Job';
import { lendingConfigs, platformId } from './constants';
import { LendingData } from './types';
import { getRpcEndpoint } from '../../utils/clients/constants';
import { lendingPoolsPrefix } from './helpers';

const executor: JobExecutor = async (cache: Cache) => {
  const lendingConfigsArray = Array.from(lendingConfigs.values()).flat();

  for (let i = 0; i < lendingConfigsArray.length; i++) {
    const lendingConfig = lendingConfigsArray[i];
    if (!lendingConfig) continue;

    const {
      uiPoolDataProviderAddress,
      uiIncentiveDataProviderAddress,
      lendingPoolAddressProvider,
      chainId,
      networkId,
    } = lendingConfig;

    const rpcEndpoint = getRpcEndpoint(networkId);
    const user = rpcEndpoint.basicAuth?.username;
    const password = rpcEndpoint.basicAuth?.password;
    const provider = new StaticJsonRpcProvider(
      {
        url: rpcEndpoint.url,
        user,
        password,
      },
      chainId
    );
    if (!provider) continue;

    const poolDataProvider = new UiPoolDataProvider({
      uiPoolDataProviderAddress,
      provider,
      chainId,
    });

    const incentiveDataProvider = new UiIncentiveDataProvider({
      uiIncentiveDataProviderAddress,
      provider,
      chainId,
    });

    if (!poolDataProvider || !incentiveDataProvider) continue;

    // If it fails, this is probably because of a contract upgrade.
    // Make sure contracts in /constants.ts are up-to-date.
    const reserves = await poolDataProvider.getReservesHumanized({
      lendingPoolAddressProvider,
    });

    const reservesArray = reserves.reservesData;
    const { baseCurrencyData } = reserves;
    const { marketReferenceCurrencyDecimals } = baseCurrencyData;
    const marketReferencePriceInUsd =
      baseCurrencyData.marketReferenceCurrencyPriceInUsd;
    const currentTimestamp = Math.round(Date.now() / 1000);
    const reserveIncentives =
      await incentiveDataProvider.getReservesIncentivesDataHumanized({
        lendingPoolAddressProvider,
      });
    const formattedReserves = formatReservesAndIncentives({
      reserves: reservesArray,
      currentTimestamp,
      marketReferenceCurrencyDecimals,
      marketReferencePriceInUsd,
      reserveIncentives,
    });

    const lendingData: LendingData = {
      lendingPoolAddressProvider,
      chainId,
      networkId,
      currentTimestamp,
      reserveIncentives,
      formattedReserves,
      marketReferencePriceInUsd,
      marketReferenceCurrencyDecimals,
    };
    await cache.setItem(lendingPoolAddressProvider, lendingData, {
      prefix: lendingPoolsPrefix,
      networkId,
    });
    if (lendingConfig.version !== 3) continue;

    const underlyingAssetPrices = await cache.getTokenPrices(
      lendingData.formattedReserves.map((r) => r.underlyingAsset),
      networkId
    );
    for (let j = 0; j < lendingData.formattedReserves.length; j++) {
      const formattedReserve = lendingData.formattedReserves[j];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aTokenAddress = (formattedReserve as any).aTokenAddress as string;
      if (!aTokenAddress) continue;

      const underlyingAssetPrice = underlyingAssetPrices[j];
      if (!underlyingAssetPrice) continue;

      await cache.setTokenPriceSource({
        id: platformId,
        weight: 1,
        address: aTokenAddress,
        networkId,
        platformId,
        decimals: formattedReserve.decimals,
        price: underlyingAssetPrice.price,
        underlyings: [
          {
            address: formattedReserve.underlyingAsset,
            amountPerLp: 1,
            decimals: formattedReserve.decimals,
            networkId,
            price: underlyingAssetPrice.price,
          },
        ],
        elementName: lendingConfig.elementName,
        timestamp: Date.now(),
      });
    }
  }
};

const job: Job = {
  id: `${platformId}-lending-pools`,
  executor,
};
export default job;
