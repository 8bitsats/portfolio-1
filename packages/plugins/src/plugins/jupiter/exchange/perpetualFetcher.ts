import {
  NetworkId,
  PortfolioAsset,
  PortfolioElement,
  PortfolioElementType,
  UniTokenInfo,
  Yield,
  getElementLendingValues,
} from '@sonarwatch/portfolio-core';
import BigNumber from 'bignumber.js';
import { PublicKey } from '@solana/web3.js';
import { Cache } from '../../../Cache';
import { Fetcher, FetcherExecutor } from '../../../Fetcher';
import { getClientSolana } from '../../../utils/clients';
import { getParsedProgramAccounts } from '../../../utils/solana';
import { perpetualsPositionsFilter } from '../filters';
import { CustodyInfo } from '../types';
import { getMultipleAccountsInfoSafe } from '../../../utils/solana/getMultipleAccountsInfoSafe';
import { getPythPricesDatasMap } from '../../../utils/solana/pyth/helpers';
import { tokenListsDetailsPrefix } from '../../tokens/constants';
import { custodiesKey, perpsProgramId, platformId } from './constants';
import { Side, positionStruct } from './structs';

const usdFactor = new BigNumber(10 ** 6);
const executor: FetcherExecutor = async (owner: string, cache: Cache) => {
  const client = getClientSolana();

  const perpetualsPositions = await getParsedProgramAccounts(
    client,
    positionStruct,
    perpsProgramId,
    perpetualsPositionsFilter(owner)
  );
  if (
    perpetualsPositions.length === 0 ||
    !perpetualsPositions.some((perp) => perp.sizeUsd.isGreaterThan(0))
  )
    return [];

  const custodiesAccounts = await cache.getItem<CustodyInfo[]>(custodiesKey, {
    prefix: platformId,
    networkId: NetworkId.solana,
  });
  if (!custodiesAccounts) return [];

  const oraclesPubkeys: PublicKey[] = [];
  const custodyById: Map<string, CustodyInfo> = new Map();
  custodiesAccounts.forEach((acc) => {
    oraclesPubkeys.push(new PublicKey(acc.oracle.oracleAccount));
    custodyById.set(acc.pubkey, acc);
  });

  const oracleAccounts = await getMultipleAccountsInfoSafe(
    client,
    oraclesPubkeys
  );
  const pythPricesByAccount = getPythPricesDatasMap(
    oraclesPubkeys,
    oracleAccounts
  );

  const tokensDetailsById: Map<string, UniTokenInfo> = new Map();
  const tokensDetails = await cache.getItems<UniTokenInfo>(
    custodiesAccounts.map((acc) => acc.mint),
    { prefix: tokenListsDetailsPrefix, networkId: NetworkId.solana }
  );
  tokensDetails.forEach((tD) =>
    tD ? tokensDetailsById.set(tD.address, tD) : undefined
  );

  const elements: PortfolioElement[] = [];
  for (const position of perpetualsPositions) {
    if (position.sizeUsd.isLessThanOrEqualTo(0)) continue;
    if (position.side === Side.None) continue;
    const isLong = position.side === Side.Long;

    const custody = custodyById.get(position.custody.toString());
    const collateralCustody = custodyById.get(
      position.collateralCustody.toString()
    );
    if (!custody || !collateralCustody) continue;

    const borrowedAssets: PortfolioAsset[] = [];
    const borrowedYields: Yield[][] = [];
    const suppliedAssets: PortfolioAsset[] = [];
    const suppliedYields: Yield[][] = [];
    const rewardAssets: PortfolioAsset[] = [];
    const { collateralUsd, sizeUsd, price, cumulativeInterestSnapshot } =
      position;
    const openingPrice = price.dividedBy(usdFactor);

    const custodyPriceData = pythPricesByAccount.get(
      custody.oracle.oracleAccount
    );
    const collateralCustodyPriceData = pythPricesByAccount.get(
      collateralCustody.oracle.oracleAccount
    );
    if (
      !custodyPriceData ||
      !custodyPriceData.price ||
      !collateralCustodyPriceData ||
      !collateralCustodyPriceData.price
    )
      continue;
    const currentPrice = new BigNumber(custodyPriceData.price);

    const leverage = sizeUsd.dividedBy(collateralUsd);

    const custodyDetails = tokensDetailsById.get(custody.mint);
    const custodyName = custodyDetails ? custodyDetails.symbol : '';

    const collatAmount = collateralUsd
      .dividedBy(collateralCustodyPriceData.price)
      .dividedBy(usdFactor);
    const collatValue = collateralUsd.dividedBy(usdFactor).toNumber();

    const custodyAmount = collatAmount.times(leverage);
    const custodyValue = sizeUsd.dividedBy(usdFactor).toNumber();

    const borrowFee = sizeUsd
      .times(
        new BigNumber(
          collateralCustody.fundingRateState.cumulativeInterestRate
        ).minus(cumulativeInterestSnapshot)
      )
      .dividedBy(10 ** 15)
      .absoluteValue();

    const openAndCloseFees = sizeUsd.times(0.001).times(2).dividedBy(usdFactor);
    const fees = borrowFee.plus(openAndCloseFees).negated().toNumber();

    const priceDelta = isLong
      ? currentPrice.minus(openingPrice)
      : openingPrice.minus(currentPrice);
    const priceVar = priceDelta.dividedBy(openingPrice);

    const pnl = priceVar.times(collatValue).times(leverage).toNumber();

    suppliedAssets.push({
      type: 'token',
      networkId: NetworkId.solana,
      value: collatValue,
      attributes: {},
      data: {
        amount: collatAmount.toNumber(),
        address: collateralCustody.mint,
        price: collateralCustodyPriceData.price,
      },
    });
    borrowedAssets.push({
      type: 'token',
      networkId: NetworkId.solana,
      value: custodyValue,
      attributes: {},
      data: {
        amount: custodyAmount.toNumber(),
        address: custody.mint,
        price: custodyPriceData.price,
      },
    });
    rewardAssets.push({
      type: 'generic',
      networkId: NetworkId.solana,
      value: pnl,
      attributes: {},
      data: { name: 'PNL ($)', amount: pnl, price: null },
    });
    rewardAssets.push({
      type: 'generic',
      networkId: NetworkId.solana,
      value: fees,
      attributes: {},
      data: { name: 'Fees O/C ($)', amount: fees, price: null },
    });

    if (suppliedAssets.length === 0 && borrowedAssets.length === 0) continue;

    const { borrowedValue, suppliedValue, healthRatio, rewardValue } =
      getElementLendingValues(suppliedAssets, borrowedAssets, rewardAssets);

    const value = collateralUsd.dividedBy(usdFactor).plus(pnl).toNumber();
    const side = isLong ? 'Long' : 'Short';

    elements.push({
      type: PortfolioElementType.borrowlend,
      networkId: NetworkId.solana,
      platformId,
      label: 'Leverage',
      value,
      name: `${custodyName} ${side} ${leverage.decimalPlaces(2)}x`,
      data: {
        borrowedAssets,
        borrowedValue,
        borrowedYields,
        suppliedAssets,
        suppliedValue,
        suppliedYields,
        collateralRatio: null,

        rewardAssets,
        rewardValue,
        healthRatio,
        value,
      },
    });
  }

  return elements;
};

const fetcher: Fetcher = {
  id: `${platformId}-perpetual`,
  networkId: NetworkId.solana,
  executor,
};

export default fetcher;
