import { PortfolioAsset } from '../Portfolio';
import { UsdValue } from '../UsdValue';

function getCollateralAndHealthRatios(
  suppliedValue: UsdValue,
  borrowedValue: UsdValue
) {
  let collateralRatio: number | null = null;
  let healthRatio: number | null = null;
  if (borrowedValue === 0) {
    collateralRatio = -1;
    healthRatio = 1;
  } else if (suppliedValue && borrowedValue) {
    collateralRatio = suppliedValue / borrowedValue;
    healthRatio = (suppliedValue - 2 * borrowedValue) / suppliedValue;
  }
  return [collateralRatio, healthRatio];
}

export function getElementLendingValues(
  suppliedAssets: PortfolioAsset[],
  borrowedAssets: PortfolioAsset[],
  rewardAssets: PortfolioAsset[]
) {
  const rewardsValue: UsdValue = rewardAssets.reduce(
    (acc: UsdValue, asset) =>
      acc !== null && asset.value !== null ? acc + asset.value : null,
    0
  );
  const suppliedValue: UsdValue = suppliedAssets.reduce(
    (acc: UsdValue, asset) =>
      acc !== null && asset.value !== null ? acc + asset.value : null,
    0
  );
  const borrowedValue: UsdValue = borrowedAssets.reduce(
    (acc: UsdValue, asset) =>
      acc !== null && asset.value !== null ? acc + asset.value : null,
    0
  );
  const [collateralRatio, healthRatio]: (number | null)[] =
    getCollateralAndHealthRatios(suppliedValue, borrowedValue);

  // Total value
  let value =
    suppliedValue !== null && borrowedValue !== null
      ? suppliedValue - borrowedValue
      : null;
  if (rewardsValue !== null && value !== null) value += rewardsValue;

  return {
    borrowedValue,
    suppliedValue,
    rewardsValue,
    collateralRatio,
    healthRatio,
    value,
  };
}
