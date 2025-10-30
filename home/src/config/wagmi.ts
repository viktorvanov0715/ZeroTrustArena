import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Zero Trust Arena',
  projectId: '9f407016bc3a21b7b82d49f683e4c2a0',
  chains: [sepolia],
  ssr: false,
});
