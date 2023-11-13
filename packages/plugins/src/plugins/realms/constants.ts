import { Platform } from '@sonarwatch/portfolio-core';

export const platformId = 'realms';

export const realmsPlatform: Platform = {
  id: platformId,
  name: 'Realms',
  image: 'https://sonar.watch/img/platforms/realms.png',
  defiLlamaId: 'spl-governance',
  website: 'https://app.realms.today/',
};

export const splGovProgramsKey = 'splGovernancePrograms';

export const splGovernanceUrl =
  'https://app.realms.today/api/splGovernancePrograms';
