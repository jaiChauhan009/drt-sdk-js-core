import { Address } from "../address";
import { IAddress } from "../interface";
import { IContractQueryResponse } from "../interfaceOfNetwork";
import { SmartContractQuery, SmartContractQueryResponse } from "../smartContractQuery";

interface INetworkProvider {
    queryContract(query: IQuery): Promise<IContractQueryResponse>;
}

interface IQuery {
    address: IAddress;
    caller?: IAddress;
    func: { toString(): string };
    value?: { toString(): string };
    getEncodedArguments(): string[];
}

export class QueryRunnerAdapter {
    private readonly networkProvider: INetworkProvider;

    constructor(options: { networkProvider: INetworkProvider }) {
        this.networkProvider = options.networkProvider;
    }

    async runQuery(query: SmartContractQuery): Promise<SmartContractQueryResponse> {
        const legacyQuery: IQuery = {
            address: Address.fromBech32(query.contract),
            caller: query.caller ? Address.fromBech32(query.caller) : undefined,
            func: query.function,
            value: query.value,
            getEncodedArguments: () => query.arguments.map((arg) => Buffer.from(arg).toString("hex")),
        };

        const legacyQueryResponse = await this.networkProvider.queryContract(legacyQuery);
        const queryResponse = new SmartContractQueryResponse({
            function: query.function,
            returnCode: legacyQueryResponse.returnCode.toString(),
            returnMessage: legacyQueryResponse.returnMessage,
            returnDataParts: legacyQueryResponse.getReturnDataParts(),
        });

        return queryResponse;
    }
}
