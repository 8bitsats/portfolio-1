import { Fetcher } from './Fetcher';
import { Job } from './Job';
import * as platformsObj from './platforms';
import {
  jobs as tokensJobs,
  fetchers as tokensFetchers,
} from './plugins/tokens';
import { fetchers as marinadeFetchers } from './plugins/marinade';
import {
  jobs as marginfiJobs,
  fetchers as marginfiFetchers,
} from './plugins/marginfi';
import {
  jobs as solendJobs,
  fetchers as solendFetchers,
} from './plugins/solend';
import {
  jobs as raydiumJobs,
  fetchers as raydiumFetchers,
} from './plugins/raydium';
import { jobs as orcaJobs, fetchers as orcaFetchers } from './plugins/orca';
import { jobs as meteoraJobs } from './plugins/meteora';
import { jobs as thalaJobs, fetchers as thalaFetchers } from './plugins/thala';
import { fetchers as tensorFetchers } from './plugins/tensor';
import { jobs as fooJobs, fetchers as fooFetchers } from './plugins/foo';
import { getFetchersByAddressSystem } from './utils/misc/getFetchersByAddressSystem';

export * from './Cache';

export * from './platforms';
export const platforms = Object.values(platformsObj);

export const jobs: Job[] = [
  ...tokensJobs,
  ...thalaJobs,
  ...fooJobs,
  ...marginfiJobs,
  ...raydiumJobs,
  ...solendJobs,
  ...meteoraJobs,
  ...orcaJobs,
];

export const fetchers: Fetcher[] = [
  ...tokensFetchers,
  ...fooFetchers,
  ...tensorFetchers,
  ...marginfiFetchers,
  ...marinadeFetchers,
  ...solendFetchers,
  ...thalaFetchers,
  ...raydiumFetchers,
  ...orcaFetchers,
];

export const fetchersByAddressSystem = getFetchersByAddressSystem(fetchers);
