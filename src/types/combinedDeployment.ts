import { TokenDeploymentParams } from './tokenDeployment';
import { PoolDeploymentParams } from './poolDeployment';

export interface CombinedDeploymentParams {
  token: TokenDeploymentParams;
  pool: Omit<PoolDeploymentParams, 'poolParams'> & {
    poolParams: Omit<PoolDeploymentParams['poolParams'], 'token'>;
  };
}
