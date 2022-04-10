import { IBech32Address } from "./interface";
import { TransactionLogs } from "./transactionLogs";
import { Bech32Address } from "./primitives";

export class ContractResults {
    readonly items: ContractResultItem[];

    constructor(items: ContractResultItem[]) {
        this.items = items;

        this.items.sort(function (a: ContractResultItem, b: ContractResultItem) {
            return a.nonce.valueOf() - b.nonce.valueOf();
        });
    }

    static empty(): ContractResults {
        return new ContractResults([]);
    }

    static fromProxyHttpResponse(results: any[]): ContractResults {
        let items = results.map(item => ContractResultItem.fromProxyHttpResponse(item));
        return new ContractResults(items);
    }

    static fromApiHttpResponse(results: any[]): ContractResults {
        let items = results.map(item => ContractResultItem.fromApiHttpResponse(item));
        return new ContractResults(items);
    }
}

export class ContractResultItem {
    hash: string = "";
    nonce: number = 0;
    value: string = "";
    receiver: IBech32Address = new Bech32Address("");
    sender: IBech32Address = new Bech32Address("");
    data: string = "";
    previousHash: string = "";
    originalHash: string = "";
    gasLimit: number = 0;
    gasPrice: number = 0;
    callType: number = 0;
    returnMessage: string = "";
    logs: TransactionLogs = TransactionLogs.empty();

    constructor(init?: Partial<ContractResultItem>) {
        Object.assign(this, init);
    }

    static fromProxyHttpResponse(response: any): ContractResultItem {
        let item = ContractResultItem.fromHttpResponse(response);
        return item;
    }

    static fromApiHttpResponse(response: any): ContractResultItem {
        let item = ContractResultItem.fromHttpResponse(response);

        item.data = Buffer.from(item.data, "base64").toString();
        item.callType = Number(item.callType);

        return item;
    }

    private static fromHttpResponse(response: any): ContractResultItem {
        let item = new ContractResultItem();

        item.hash = response.hash;
        item.nonce = Number(response.nonce || 0);
        item.value = (response.value || 0).toString();
        item.receiver = new Bech32Address(response.receiver);
        item.sender = new Bech32Address(response.sender);
        item.previousHash = response.prevTxHash;
        item.originalHash = response.originalTxHash;
        item.gasLimit = Number(response.gasLimit || 0);
        item.gasPrice = Number(response.gasPrice || 0);
        item.data = response.data || "";
        item.callType = response.callType;
        item.returnMessage = response.returnMessage;

        item.logs = TransactionLogs.fromHttpResponse(response.logs || {});

        return item;
    }
}
