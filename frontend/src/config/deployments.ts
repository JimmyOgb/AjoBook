import rawDeployments from './deployments.json';

export interface DeploymentConfig {
  factory: `0x${string}`;
  seedCircle: `0x${string}`;
  usdt: `0x${string}`;
  testUsdt: `0x${string}`;
  tapeOutCircuitId: `0x${string}`;
  tapeOutContainer: `0x${string}`;
  tapeOutProcessor: `0x${string}`;
}

export function getDeployment(chainId?: number): DeploymentConfig {
  const cid = chainId ? String(chainId) : '1952';
  const rawAny = rawDeployments as any;
  const data = (rawAny)[cid] || (rawAny)['1952'] || rawAny;
  return {
    factory: (data.factory || rawAny.factory) as `0x${string}`,
    seedCircle: (data.seedCircle || rawAny.seedCircle) as `0x${string}`,
    usdt: (data.usdt || rawAny.usdt) as `0x${string}`,
    testUsdt: (data.testUsdt || data.usdt || rawAny.testUsdt || rawAny.usdt) as `0x${string}`,
    tapeOutCircuitId: (data.tapeOutCircuitId || rawAny.tapeOutCircuitId) as `0x${string}`,
    tapeOutContainer: (data.tapeOutContainer || rawAny.tapeOutContainer) as `0x${string}`,
    tapeOutProcessor: (data.tapeOutProcessor || rawAny.tapeOutProcessor) as `0x${string}`,
  };
}

export default rawDeployments;
