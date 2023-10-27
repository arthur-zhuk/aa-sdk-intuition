// importing required dependencies
import { LightSmartContractAccount, getDefaultLightAccountFactory, } from "@alchemy/aa-accounts";
import { AlchemyProvider } from "@alchemy/aa-alchemy";
import { LocalAccountSigner, getDefaultEntryPointContract, } from "@alchemy/aa-core";
import { sepolia } from "viem/chains";
const chain = sepolia;
const PRIVATE_KEY = "0xYourEOAPrivateKey"; // Replace with the private key of your EOA that will be the owner of Light Account
const eoaSigner = LocalAccountSigner.privateKeyToAccountSigner(PRIVATE_KEY); // Create a signer for your EOA
// Entrypoint address. Check out https://docs.alchemy.com/reference/eth-supportedentrypoints for all the supported entrypoints
const entryPointAddress = getDefaultEntryPointContract(chain);
// Default address for Light Account on Sepolia, you can replace it with your own.
const factoryAddress = getDefaultLightAccountFactory(chain);
// Create a provider with your EOA as the smart account owner, this provider is used to send user operations from your smart account and interact with the blockchain
const provider = new AlchemyProvider({
    apiKey: "ALCHEMY_API_KEY",
    chain,
}).connect((rpcClient) => new LightSmartContractAccount({
    entryPointAddress,
    chain,
    owner: eoaSigner,
    factoryAddress,
    rpcClient,
}));
// Logging the smart account address -- please fund this address with some SepoliaETH in order for the user operations to be executed successfully
provider.getAddress().then((address) => console.log(address));
// Send a user operation from your smart contract account
const { hash } = await provider.sendUserOperation({
    target: "0xTargetAddress",
    data: "0xCallData",
    value: 0n, // value: bigint or undefined
});
console.log(hash); // Log the user operation hash
