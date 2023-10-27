import {
  SmartAccountProvider,
  deepHexlify,
  getUserOperationHash,
  isValidRequest,
  resolveProperties,
  type AccountMiddlewareFn,
  type SmartAccountProviderConfig,
  type UserOperationCallData,
} from "@alchemy/aa-core";
import { type HttpTransport } from "viem";
import {
  arbitrum,
  arbitrumGoerli,
  optimism,
  optimismGoerli,
} from "viem/chains";
import { SupportedChains } from "./chains.js";
import { createAlchemyEnhanced4337Client } from "./client/factory.js";
import type { SimulateExecutionResponse } from "./client/interfaces.js";
import type { AlchemyEnhanced4337Client } from "./client/types.js";
import { withAlchemyGasFeeEstimator } from "./middleware/gas-fees.js";
import {
  withAlchemyGasManager,
  type AlchemyGasManagerConfig,
} from "./middleware/gas-manager.js";

export type ConnectionConfig =
  | { rpcUrl?: never; apiKey: string; jwt?: never }
  | { rpcUrl?: never; apiKey?: never; jwt: string }
  | { rpcUrl: string; apiKey?: never; jwt?: never }
  | { rpcUrl: string; apiKey?: never; jwt: string };

export type AlchemyProviderConfig = {
  feeOpts?: {
    /** this adds a percent buffer on top of the base fee estimated (default 50%)
     * NOTE: this is only applied if the default fee estimator is used.
     */
    baseFeeBufferPercent?: bigint;
    /** this adds a percent buffer on top of the priority fee estimated (default 5%)'
     * * NOTE: this is only applied if the default fee estimator is used.
     */
    maxPriorityFeeBufferPercent?: bigint;
    /** this adds a percent buffer on top of the preVerificationGasEstimated
     *
     * Defaults 5% on Arbitrum and Optimism, 0% elsewhere
     *
     * This is only useful on Arbitrum and Optimism, where the preVerificationGas is
     * dependent on the gas fee during the time of estimation. To improve chances of
     * the UserOperation being mined, users can increase the preVerificationGas by
     * a buffer. This buffer will always be charged, regardless of price at time of mine.
     *
     * NOTE: this is only applied if the defualt gas estimator is used.
     */
    preVerificationGasBufferPercent?: bigint;
  };
} & Omit<SmartAccountProviderConfig, "rpcProvider"> &
  ConnectionConfig;

export class AlchemyProvider extends SmartAccountProvider<HttpTransport> {
  private pvgBuffer: bigint;
  private feeOptsSet: boolean;
  private client: AlchemyEnhanced4337Client<HttpTransport>;

  constructor({
    chain,
    entryPointAddress,
    opts,
    feeOpts,
    ...connectionConfig
  }: AlchemyProviderConfig) {
    const _chain =
      typeof chain === "number" ? SupportedChains.get(chain) : chain;
    if (!_chain || !_chain.rpcUrls["alchemy"]) {
      throw new Error(`AlchemyProvider: chain (${chain}) not supported`);
    }

    const rpcUrl =
      connectionConfig.rpcUrl == null
        ? `${_chain.rpcUrls.alchemy.http[0]}/${connectionConfig.apiKey ?? ""}`
        : connectionConfig.rpcUrl;

    const client = createAlchemyEnhanced4337Client({
      chain: _chain,
      rpcUrl,
      ...(connectionConfig.jwt != null && {
        fetchOptions: {
          headers: {
            Authorization: `Bearer ${connectionConfig.jwt}`,
          },
        },
      }),
    });

    super({ rpcProvider: client, entryPointAddress, chain: _chain, opts });

    withAlchemyGasFeeEstimator(
      this,
      feeOpts?.baseFeeBufferPercent ?? 50n,
      feeOpts?.maxPriorityFeeBufferPercent ?? 5n
    );

    if (feeOpts?.preVerificationGasBufferPercent) {
      this.pvgBuffer = feeOpts?.preVerificationGasBufferPercent;
    } else if (
      new Set<number>([
        arbitrum.id,
        arbitrumGoerli.id,
        optimism.id,
        optimismGoerli.id,
      ]).has(this.chain.id)
    ) {
      this.pvgBuffer = 5n;
    } else {
      this.pvgBuffer = 0n;
    }

    this.feeOptsSet = !!feeOpts;
    this.client = client;
  }

  override gasEstimator: AccountMiddlewareFn = async (struct) => {
    const request = deepHexlify(await resolveProperties(struct));
    const estimates = await this.rpcClient.estimateUserOperationGas(
      request,
      this.entryPointAddress
    );
    estimates.preVerificationGas =
      (BigInt(estimates.preVerificationGas) * (100n + this.pvgBuffer)) / 100n;

    return {
      ...struct,
      ...estimates,
    };
  };

  simulateUserOperationExecution = async (
    uoCallData: UserOperationCallData
  ): Promise<SimulateExecutionResponse | SimulateExecutionResponse[]> => {
    const uoStruct = await this.buildUserOperation(uoCallData);

    if (!this.account) {
      throw new Error("account not connected");
    }

    const request = deepHexlify(uoStruct);
    if (!isValidRequest(request)) {
      // this pretty prints the uo
      throw new Error(
        `Request is missing parameters. All properties on UserOperationStruct must be set. uo: ${JSON.stringify(
          request,
          null,
          2
        )}`
      );
    }

    request.signature = (await this.account.signMessage(
      getUserOperationHash(
        request,
        this.entryPointAddress as `0x${string}`,
        BigInt(this.chain.id)
      )
    )) as `0x${string}`;

    return this.client.simulateUserOperationExecution(request);
  };

  /**
   * This methods adds the Alchemy Gas Manager middleware to the provider.
   *
   * @param config - the Alchemy Gas Manager configuration
   * @returns {AlchemyProvider} - a new AlchemyProvider with the Gas Manager middleware
   */
  withAlchemyGasManager(config: AlchemyGasManagerConfig): AlchemyProvider {
    if (!this.isConnected()) {
      throw new Error(
        "AlchemyProvider: account is not set, did you call `connect` first?"
      );
    }

    return withAlchemyGasManager(this, config, !this.feeOptsSet);
  }
}
