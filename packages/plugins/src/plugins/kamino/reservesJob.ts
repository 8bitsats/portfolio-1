import { NetworkId } from '@sonarwatch/portfolio-core';
import { Cache } from '../../Cache';
import { Job, JobExecutor } from '../../Job';
import { getClientSolana } from '../../utils/clients';
import { getParsedProgramAccounts } from '../../utils/solana';
import { dataSizeFilter } from '../../utils/solana/filters';
import { klendProgramId, platformId, reservesKey } from './constants';
import { reserveStruct } from './structs/klend';
import { calculateBorrowAPR, calculateSupplyAPR } from './helpers';
import { ReserveEnhanced } from './types';

const executor: JobExecutor = async (cache: Cache) => {
  const client = getClientSolana();
  const reservesAccounts = (
    await Promise.all([
      getParsedProgramAccounts(
        client,
        reserveStruct,
        klendProgramId,
        dataSizeFilter(8624)
      ),
      getParsedProgramAccounts(
        client,
        reserveStruct,
        klendProgramId,
        dataSizeFilter(8464)
      ),
    ])
  ).flat();
  if (reservesAccounts.length !== 0) {
    const reserveById: Record<string, ReserveEnhanced> = {};
    for (const reserve of reservesAccounts) {
      const borrowApr = calculateBorrowAPR(reserve);
      const supplyApr = calculateSupplyAPR(reserve);
      reserveById[reserve.pubkey.toString()] = {
        ...reserve,
        borrowApr,
        supplyApr,
      };
    }
    await cache.setItem(reservesKey, reserveById, {
      prefix: platformId,
      networkId: NetworkId.solana,
    });
  }
};

const job: Job = {
  id: `${platformId}-reserves`,
  executor,
};
export default job;
