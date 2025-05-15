import type {
  OnNameLookupHandler,
  OnInstallHandler,
} from "@metamask/snaps-sdk";
import { Box, Heading, Text, Divider, Row } from "@metamask/snaps-sdk/jsx";
import type { Contract } from "ethers";
import { ethers } from "ethers";

// Helper function to extract base domain name
const extractBaseDomain = (domain: string): string => {
  // If there's no dot, return the domain as is
  if (!domain.includes(".")) {
    return domain;
  }
  // Split by dot and take the first part, ensuring it's not undefined
  const parts = domain.split(".");
  return parts[0] ?? domain;
};

const abi = [
  {
    name: "TOP_LEVEL_DOMAIN",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    name: "nameToAdress",
    type: "function",
    inputs: [
      {
        name: "domainName",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "nameToAddress",
    type: "function",
    inputs: [
      {
        name: "domainName",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
];

// get domain contract
const getDomainContract = async (blockchainId: string) => {
  const AUTOCONTRACTS_API_HOST = "https://autocontracts.conft.app";

  const url = `${AUTOCONTRACTS_API_HOST}/chains/${blockchainId}/contracts/domains`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch domain contract: ${response.statusText}`,
      );
    }
    const result = await response.json();
    console.log("result = ", result);
    return result;
  } catch (error) {
    console.error("Error fetching domain contract:", error);
    return null;
  }
};

// contracts on different chains might have different names
// for function with same logic due to legacy typo
const getAddress = async (contract: Contract, baseDomain: string) => {
  try {
    return (await contract.nameToAddress(baseDomain)) as string;
  } catch {
    try {
      return (await contract.nameToAdress(baseDomain)) as string;
    } catch {
      return null;
    }
  }
};

// resolving name via contract
const resolveDomain = async (baseDomain: string, blockchainId: string) => {
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
    const topLevelDomain: string = await contract.TOP_LEVEL_DOMAIN();
    const domainName = `${baseDomain}${topLevelDomain}`;
    const resolvedAddress = await getAddress(contract, baseDomain);

    return resolvedAddress
      ? {
          resolvedAddress,
          domainName,
        }
      : null;
  } catch (error) {
    console.error("Error resolving domain: ", error);
    return null;
  }
};

export const onNameLookup: OnNameLookupHandler = async (request) => {
  const { chainId, domain } = request;

  if (!domain) {
    return null;
  }

  // extract metamask chain id
  const parsedChainId = chainId.split(":")[1];
  if (!parsedChainId) {
    return null;
  }

  // Handle domain to address lookup
  const baseDomain = extractBaseDomain(domain);
  const data = await resolveDomain(baseDomain, parsedChainId);
  if (!data) {
    return null;
  }
  const { resolvedAddress, domainName } = data;

  return {
    resolvedAddresses: [
      {
        resolvedAddress,
        protocol: "Conft Domains",
        domainName,
      },
    ],
  };
};

export const onInstall: OnInstallHandler = async () => {
  await snap.request({
    method: "snap_dialog",
    params: {
      type: "alert",
      content: (
        <Box>
          <Heading>You're all set! ✅</Heading>
          <Text>Now you can resolve Conft Domains through the Snap.</Text>
          <Divider />
          <Row label="Domain Resolution">
            <Text>Resolves domains using blockchain contracts.</Text>
          </Row>
        </Box>
      ),
    },
  });
};
