import { Storage, createStorage, StorageValue, Driver } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';
import redisDriver from 'unstorage/drivers/redis';
import httpDriver from 'unstorage/drivers/http';
import {
  NetworkIdType,
  TokenPrice,
  TokenPriceSource,
  formatTokenAddress,
  formatTokenPriceSource,
  publicBearerToken,
  pushTokenPriceSource,
  tokenPriceFromSources,
  tokenPriceSourceTtl,
} from '@sonarwatch/portfolio-core';
import overlayDriver from './overlayDriver';
import memoryDriver, {
  DRIVER_SW_MEMORY_NAME,
  MemoryDriver,
} from './memoryDriver';
import runInBatch from './utils/misc/runInBatch';

export type TransactionOptions = {
  prefix: string;
  networkId?: NetworkIdType;
};

/**
 * Represents the options for setting an item in the cache.
 */
export type TransactionOptionsSetItem = {
  /**
   * The time-to-live (TTL) value in milliseconds for the cached item.
   */
  ttl?: number;
};

const tokenPriceSourcePrefix = 'tokenpricesource';

export type CacheConfig =
  | CacheConfigOverlayHttp
  | CacheConfigMemory
  | CacheConfigRedis
  | CacheConfigFilesystem
  | CacheConfigHttp;

export type CacheConfigOverlayHttp = {
  type: 'overlayHttp';
  params: CacheConfigOverlayHttpParams;
};
export type CacheConfigOverlayHttpParams = {
  configs: { base: string; headers: Record<string, string> }[];
};

export type CacheConfigMemory = {
  type: 'memory';
  params: CacheConfigMemoryParams;
};
export type CacheConfigMemoryParams = {
  ttl?: number;
};

export type CacheConfigHttp = {
  type: 'http';
  params: CacheConfigHttpParams;
};
export type CacheConfigHttpParams = {
  base: string;
  headers?: Record<string, string>;
};

export type CacheConfigRedis = {
  type: 'redis';
  params: CacheConfigRedisParams;
};
export type CacheConfigRedisParams = {
  url: string;
  tls: boolean;
  db: number;
  ttl?: number;
};

export type CacheConfigFilesystem = {
  type: 'filesystem';
  params: CacheConfigFilesystemParams;
};
export type CacheConfigFilesystemParams = {
  base: string;
};

export type CacheConfigParams = {
  filesystem: {
    endpoint: string;
  };
  redis: {
    url: string;
    tls: boolean;
    db: number;
  };
};

export class Cache {
  readonly storage: Storage;
  readonly driver: Driver;
  private tokenPriceStorage: Storage;

  constructor(cacheConfig: CacheConfig) {
    this.driver = getDriverFromCacheConfig(cacheConfig);
    this.storage = createStorage({
      driver: this.driver,
    });
    this.tokenPriceStorage = createStorage({
      driver: memoryDriver({
        ttl: 10000,
      }),
    });
  }

  importData(data: Map<string, string>): void {
    if (this.driver.name === DRIVER_SW_MEMORY_NAME) {
      (this.driver as MemoryDriver).importData(data, 60 * 60 * 1000);
    }
  }

  exportData(): Map<string, string> {
    if (this.driver.name === DRIVER_SW_MEMORY_NAME) {
      return (this.driver as MemoryDriver).exportData();
    }
    return new Map();
  }

  async hasItem(key: string, opts: TransactionOptions): Promise<boolean> {
    const item = await this.getItem(key, opts);
    return item !== undefined;
  }

  async hasTokenPrice(address: string, networkId: NetworkIdType) {
    const fAddress = formatTokenAddress(address, networkId);
    const tokenPrice = await this.getTokenPrice(fAddress, networkId);
    return tokenPrice !== undefined;
  }

  async getItem<K extends StorageValue>(
    key: string,
    opts: TransactionOptions
  ): Promise<K | undefined> {
    const fullKey = getFullKey(key, opts);
    const item = await this.storage.getItem<K>(fullKey).catch(() => null);
    return item === null ? undefined : (item as K);
  }

  private async getTokenPriceLocal(address: string, networkId: NetworkIdType) {
    const fAddress = formatTokenAddress(address, networkId);
    const fullkey = getFullKey(fAddress, {
      prefix: networkId,
    });
    return this.tokenPriceStorage.getItem<TokenPrice>(fullkey);
  }

  private async setTokenPriceLocal(tokenPrice: TokenPrice) {
    const fullkey = getFullKey(tokenPrice.address, {
      prefix: tokenPrice.networkId,
    });
    return this.tokenPriceStorage.setItem(fullkey, tokenPrice);
  }

  async getTokenPrice(address: string, networkId: NetworkIdType) {
    const local = await this.getTokenPriceLocal(address, networkId);
    if (local) return local;

    const fAddress = formatTokenAddress(address, networkId);
    const sources = await this.getTokenPriceSources(fAddress, networkId);
    if (!sources) return undefined;
    const tokenPrice = tokenPriceFromSources(sources);

    if (tokenPrice) await this.setTokenPriceLocal(tokenPrice);
    return tokenPrice;
  }

  async getTokenPrices(addresses: string[], networkId: NetworkIdType) {
    const fAddresses = addresses.map((a) => formatTokenAddress(a, networkId));
    const ffAddresses = [...new Set(fAddresses)];
    const tokenPriceByAddress: Map<string, TokenPrice | undefined> = new Map();

    const mSources = await this.getTokenPricesSources(ffAddresses, networkId);
    mSources.forEach((sources, i) => {
      const address = ffAddresses[i];
      if (!sources) tokenPriceByAddress.set(address, undefined);
      else tokenPriceByAddress.set(address, tokenPriceFromSources(sources));
    });
    return fAddresses.map((address) => tokenPriceByAddress.get(address));
  }

  async getTokenPricesAsMap(
    addresses: string[],
    networkId: NetworkIdType
  ): Promise<Map<string, TokenPrice>> {
    const tokenPrices = await this.getTokenPrices(addresses, networkId);
    const tokenPricesMap: Map<string, TokenPrice> = new Map();
    tokenPrices.forEach((tp) => {
      if (!tp) return;
      tokenPricesMap.set(tp.address, tp);
    });
    return tokenPricesMap;
  }

  private async getTokenPriceSources(
    address: string,
    networkId: NetworkIdType
  ) {
    const fAddress = formatTokenAddress(address, networkId);
    return this.getItem<TokenPriceSource[]>(fAddress, {
      prefix: tokenPriceSourcePrefix,
      networkId,
    });
  }

  private async getTokenPricesSources(
    addresses: string[],
    networkId: NetworkIdType
  ) {
    return this.getItems<TokenPriceSource[]>(addresses, {
      prefix: tokenPriceSourcePrefix,
      networkId,
    });
  }

  async getItems<K extends StorageValue>(
    keys: string[],
    opts: TransactionOptions
  ): Promise<(K | undefined)[]> {
    const fullKeys = keys.map((k) => getFullKey(k, opts));
    const res = await this.storage.getItems(fullKeys);
    return res.map((r) => r.value as K);
  }

  async getAllItems<K extends StorageValue>(
    opts: TransactionOptions
  ): Promise<K[]> {
    const itemsMap = await this.getAllItemsAsMap<K>(opts);
    return Array.from(itemsMap.values());
  }

  async getAllItemsAsMap<K extends StorageValue>(
    opts: TransactionOptions
  ): Promise<Map<string, K>> {
    const keys = await this.getKeys(opts);
    const itemsMap: Map<string, K> = new Map();
    const items = await this.getItems<K>(keys, opts);
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item !== undefined) itemsMap.set(keys[i], item);
    }
    return itemsMap;
  }

  async setItem<K extends StorageValue>(
    key: string,
    value: K,
    opts: TransactionOptions & TransactionOptionsSetItem
  ) {
    const fullKey = getFullKey(key, opts);

    // ttl
    let { ttl } = opts;
    if (this.driver.name === 'redis' && ttl) {
      ttl = Math.round(ttl / 1000);
    }
    return this.storage.setItem(fullKey, value, {
      ttl,
    });
  }

  async setItems<K extends StorageValue>(
    items: {
      key: string;
      value: K;
    }[],
    opts: TransactionOptions & TransactionOptionsSetItem
  ) {
    await runInBatch(
      items.map((item) => () => this.setItem(item.key, item.value, opts)),
      15
    );
  }

  async setTokenPriceSource(source: TokenPriceSource) {
    const fSource = formatTokenPriceSource(source);
    let cSources = await this.getTokenPriceSources(
      fSource.address,
      fSource.networkId
    );

    if (!cSources) cSources = [];
    const newSources = pushTokenPriceSource(cSources, fSource);
    if (!newSources) {
      await this.removeItem(fSource.address, {
        prefix: tokenPriceSourcePrefix,
        networkId: fSource.networkId,
      });
      return;
    }
    await this.setItem(fSource.address, newSources, {
      prefix: tokenPriceSourcePrefix,
      networkId: fSource.networkId,
      ttl: tokenPriceSourceTtl,
    });
  }

  async setTokenPriceSources(sources: (TokenPriceSource | null)[]) {
    const fSources = sources.filter((s) => s !== null) as TokenPriceSource[];
    await runInBatch(
      fSources.map((source) => () => this.setTokenPriceSource(source)),
      15
    );
  }

  async removeItem(key: string, opts: TransactionOptions) {
    const fullKey = getFullKey(key, opts);
    return this.storage.removeItem(fullKey);
  }

  async getKeys(opts: TransactionOptions) {
    const fullBase = getFullBase(opts);
    const keys = await this.storage.getKeys(fullBase);
    return keys.map((s) => s.substring(fullBase.length));
  }

  async getTokenPriceAddresses(networkId: NetworkIdType) {
    return this.getKeys({
      prefix: tokenPriceSourcePrefix,
      networkId,
    });
  }

  async dispose() {
    await this.tokenPriceStorage.dispose();
    return this.storage.dispose();
  }
}

function getFullKey(key: string, opts: TransactionOptions): string {
  const { networkId, prefix } = opts;
  const networkIdKeyPrefix = networkId ? `/${networkId.toString()}` : '';
  return `/${prefix}${networkIdKeyPrefix}/${key}`;
}

function getFullBase(opts: TransactionOptions) {
  const { networkId, prefix } = opts;
  const networkIdBasePrefix = networkId ? `${networkId.toString()}:` : '';
  const fullBase = `${prefix}:${networkIdBasePrefix}`;
  return fullBase;
}

function getDriverFromCacheConfig(cacheConfig: CacheConfig) {
  switch (cacheConfig.type) {
    case 'overlayHttp':
      return overlayDriver({
        layers: cacheConfig.params.configs.map((c) =>
          httpDriver({ base: c.base, headers: c.headers })
        ),
      }) as Driver;
    case 'memory':
      return memoryDriver({
        ttl: cacheConfig.params.ttl || 60 * 60 * 1000,
      }) as Driver;
    case 'filesystem':
      return fsDriver({
        base: cacheConfig.params.base,
      }) as Driver;
    case 'redis':
      return redisDriver({
        url: cacheConfig.params.url,
        tls: cacheConfig.params.tls ? {} : undefined,
        db: cacheConfig.params.db,
        ttl: cacheConfig.params.ttl,
      }) as Driver;
    case 'http':
      return httpDriver({
        base: cacheConfig.params.base,
        headers: cacheConfig.params.headers,
      }) as Driver;
    default:
      throw new Error('CacheConfig type is not valid');
  }
}

export function getCacheConfig(): CacheConfig {
  switch (process.env['CACHE_CONFIG_TYPE']) {
    case 'overlayHttp':
      return {
        type: 'overlayHttp',
        params: {
          configs: (
            process.env['CACHE_CONFIG_OVERLAY_HTTP_BASES'] ||
            'http://localhost:3000/,https://portfolio-api-public.sonar.watch/v1/portfolio/cache/'
          )
            .split(',')
            .map((base) => ({
              base,
              headers: {
                Authorization: `Bearer ${publicBearerToken}`,
              },
            })),
        },
      };
    case 'memory':
      return {
        type: 'memory',
        params: {},
      };
    case 'filesystem':
      return {
        type: 'filesystem',
        params: {
          base: process.env['CACHE_CONFIG_FILESYSTEM_BASE'] || './cache',
        },
      };
    case 'redis':
      return {
        type: 'redis',
        params: {
          url: process.env['CACHE_CONFIG_REDIS_URL'] || '127.0.0.1:6379',
          tls: process.env['CACHE_CONFIG_REDIS_TLS'] === 'true',
          db: parseInt(process.env['CACHE_CONFIG_REDIS_DB'] || '0', 10),
          ttl: process.env['CACHE_CONFIG_REDIS_TTL']
            ? parseInt(process.env['CACHE_CONFIG_REDIS_TTL'], 10)
            : undefined,
        },
      };
    case 'http':
      return {
        type: 'http',
        params: {
          base:
            process.env['CACHE_CONFIG_HTTP_BASE'] ||
            'https://portfolio-api-public.sonar.watch/v1/portfolio/cache',
          headers: {
            Authorization: `Bearer ${
              process.env['CACHE_CONFIG_HTTP_BEARER'] || publicBearerToken
            }`,
          },
        },
      };
    default:
      return {
        type: 'memory',
        params: {},
      };
  }
}

export function getCache() {
  const cacheConfig = getCacheConfig();
  return new Cache(cacheConfig);
}
