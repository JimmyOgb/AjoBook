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
  const data = (rawDeployments as any)[cid] || (rawDeployments as any)['1952'] || rawDeployments;
  return {
    factory: (data.factory || rawDeployments.factory) as `0x${string}`,
    seedCircle: (data.seedCircle || rawDeployments.seedCircle) as `0x${string}`,
    usdt: (data.usdt || rawDeployments.usdt) as `0x${string}`,
    testUsdt: (data.testUsdt || data.usdt || rawDeployments.testUsdt) as `0x${string}`,
    tapeOutCircuitId: (data.tapeOutCircuitId || rawDeployments.tapeOutCircuitId) as `0x${string}`,
    tapeOutContainer: (data.tapeOutContainer || rawDeployments.tapeOutContainer) as `0x${string}`,
    tapeOutProcessor: (data.tapeOutProcessor || rawDeployments.tapeOutProcessor) as `0x${string}`,
  };
}

export default rawDeployments;
