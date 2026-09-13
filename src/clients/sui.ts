import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Config } from '../config/env.js';
export function createSui(config: Config) {
  return new SuiGrpcClient({
    network: config.SUI_NETWORK,
    baseUrl: config.SUI_GRPC_URL,
  });
}
export type SuiReader = Pick<
  SuiGrpcClient,
  | 'getBalance'
  | 'resolveNameServiceAddress'
  | 'defaultNameServiceName'
  | 'getChainIdentifier'
>;
