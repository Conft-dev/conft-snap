import type {
  OnNameLookupHandler,
  OnInstallHandler,
} from '@metamask/snaps-sdk';
import { Box, Heading, Text, Divider, Row } from '@metamask/snaps-sdk/jsx';
import { ethers } from 'ethers';

export const onNameLookup: OnNameLookupHandler = async (request: {
  chainId: string;
  domain?: string;
}) => {
  const { chainId, domain } = request;
  if (!domain || !chainId) {
    return null;
  }

  // Функция для получения контракта с API
  const getDomainContract = async (blockchainId: string) => {
    const AUTOCONTRACTS_API_HOST = 'https://autocontracts.conft.app';

    const url = `${AUTOCONTRACTS_API_HOST}/chains/${blockchainId}/contracts/domains`;

    try {
      // const response = await fetch(url);
      // console.log(response);
      // if (!response.ok) {
      //   throw new Error(
      //     `Failed to fetch domain contract: ${response.statusText}`,
      //   );
      // }
      const result = {
        abi: [
          {
            name: 'nameToAddress',
            type: 'function',
            inputs: [
              {
                name: 'domainName',
                type: 'string',
                internalType: 'string',
              },
            ],
            outputs: [
              {
                name: '',
                type: 'address',
                internalType: 'address',
              },
            ],
            stateMutability: 'view',
          },
        ],
        address: '0xB5a236ED367840b3decA26B19B1084308CA8b0F8',
        blockchain: {
          rpcs: [
            'https://rpc.scroll.io',
            'https://rpc.ankr.com/scroll',
            'https://scroll-mainnet.chainstacklabs.com',
            'https://scroll-rpc.publicnode.com',
          ],
        },
      };
      // const result = await response.json();
      console.log('======result======', result, url);
      return result;
    } catch (error) {
      console.error('Error fetching domain contract:', error);
      return null;
    }
  };

  // // Функция для резолвинга имени через контракт
  const resolveDomain = async (domainName: string, blockchainId: string) => {
    try {
      // Получаем данные контракта
      const contractData = await getDomainContract(blockchainId);

      console.log('======contractData=====', contractData);
      if (!contractData) {
        throw new Error('Domain contract not found');
      }

      const { abi, address: contractAddress, blockchain } = contractData;
      const rpc = blockchain.rpcs[0];

      if (!rpc) {
        throw new Error('RPC URL not provided');
      }

      // Создаём провайдер и контракт
      const provider = new ethers.providers.JsonRpcProvider(
        'https://rpc.scroll.io',
      );
      const contract = new ethers.Contract(contractAddress, abi, provider);

      // Вызываем метод nameToAddress для мэтча адреса и имени
      const userAddress = await contract.nameToAddress(domainName);

      return userAddress || null;
    } catch (error) {
      console.error('Error resolving domain:', error);
      return null;
    }
  };
  // // Резолвим имя через контракт
  const parsedChainId = chainId.split(':')[1] ?? '1'; // Извлечение нужного айди из чейнайди метамаска "eip155:1" -> "1"
  const resolvedAddress = await resolveDomain(domain, parsedChainId);

  if (!resolvedAddress) {
    return null;
  }

  return {
    resolvedAddresses: [
      {
        resolvedAddress,
        protocol: 'CoLabs Domains',
        domainName: domain,
      },
    ],
  };
};

export const onInstall: OnInstallHandler = async () => {
  console.log('onInstall called');
  await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'alert',
      content: (
        <Box>
          <Heading>You're all set! ✅</Heading>
          <Text>Now you can resolve custom domains through the Snap.</Text>
          <Divider />
          <Row label="Domain Resolution">
            <Text>Resolves domains using your blockchain contracts.</Text>
          </Row>
        </Box>
      ),
    },
  });
};
