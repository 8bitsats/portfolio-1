import { PublicKey } from '@solana/web3.js';
import { Platform } from '@sonarwatch/portfolio-core';

export const platformId = 'lifinity';
export const platform: Platform = {
  id: platformId,
  name: 'Lifinity',
  image: 'https://sonar.watch/img/platforms/lifinity.png',
  // defiLlamaId: 'foo-finance', // from https://defillama.com/docs/api
  // website: 'https://myplatform.com',
  // twitter: 'https://twitter.com/myplatform',
};

export const SmartWalletProgramId = new PublicKey(
  'GokivDYuQXPZCWRkwMhdH2h91KpDQXBEmpgBgs55bnpH'
);
export const GovernProgramId = new PublicKey(
  'Govz1VyoyLD5BL6CSCxUJLVLsQHRwjfFj1prNsdNg5Jw'
);
export const LifinityLockerProgramId = new PublicKey(
  'LLoc8JX5dLAMVzbzTNKG6EFpkyJ9XCsVAGkqwQKUJoa'
);

export const rewarder = new PublicKey(
  'LRewdYDnxyP9HXCL6DQYgTaeL9FKb5Pc8Gr4UbVrtnj'
);

export const veDecimals = 6;
export const lfntyMint = 'LFNTYraetVioAPnGJht4yNg2aUZFXR776cMeN9VMjXp';
