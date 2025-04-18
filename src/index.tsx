import type {
  OnNameLookupHandler,
  OnInstallHandler,
} from "@metamask/snaps-sdk";
import { Box, Heading, Text, Divider, Row } from "@metamask/snaps-sdk/jsx";
import { ethers } from "ethers";

export const onNameLookup: OnNameLookupHandler = async (request: {
  chainId: string;
  domain?: string;
}) => {
  const { chainId, domain } = request;
  if (!domain || !chainId) {
    return null;
  }
  const abi = [
    {
      name: "TOP_LEVEL_DOMAIN",
      type: "function",
      inputs: [],
      outputs: [{ name: "", type: "string", internalType: "string" }],
      stateMutability: "view",
    },
    {
      name: "fullNameToAddress",
      type: "function",
      inputs: [
        { name: "fullDomainName", type: "string", internalType: "string" },
      ],
      outputs: [{ name: "", type: "address", internalType: "address" }],
      stateMutability: "view",
    },
  ];
  // get the contract
  const getDomainContract = async (blockchainId: string) => {
    const AUTOCONTRACTS_API_HOST = "https://autocontracts.conft.app";

    const url = `${AUTOCONTRACTS_API_HOST}/chains/${blockchainId}/contracts/domains`;

    try {
      const response = await fetch(url);
      console.log(response);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch domain contract: ${response.statusText}`,
        );
      }
      const result = await response.json();
      console.log("======result======", result, url);
      return result;
    } catch (error) {
      console.error("Error fetching domain contract:", error);
      return null;
    }
  };

  // resolving name via contract
  const resolveDomain = async (domainName: string, blockchainId: string) => {
    try {
      // get contract data
      const contractData = await getDomainContract(blockchainId);

      if (!contractData) {
        throw new Error("Domain contract not found");
      }

      const { address: contractAddress, blockchain } = contractData;
      const rpc = blockchain.custom_rpc || blockchain.rpcs[0];

      if (!rpc) {
        throw new Error("RPC URL not provided");
      }

      // initiating provider and contract
      const provider = new ethers.providers.JsonRpcProvider(rpc);
      const contract = new ethers.Contract(contractAddress, abi, provider);

      // getting user address
      const topLevelDomain = await contract.TOP_LEVEL_DOMAIN();
      const userAddress = await contract.fullNameToAddress(
        `${domainName}${topLevelDomain}`,
      );

      return userAddress || null;
    } catch (error) {
      console.error("Error resolving domain: ", error);
      return null;
    }
  };
  // resolving name via contract
  const parsedChainId = chainId.split(":")[1] ?? "1"; // extracting chain id from metamask "eip155:1" -> "1"
  const resolvedAddress = await resolveDomain(domain, parsedChainId);

  if (!resolvedAddress) {
    return null;
  }

  return {
    resolvedAddresses: [
      {
        resolvedAddress,
        protocol: "CoLabs Domains",
        domainName: domain,
      },
    ],
  };
};

export const onInstall: OnInstallHandler = async () => {
  console.log("onInstall called");
  await snap.request({
    method: "snap_dialog",
    params: {
      type: "alert",
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
