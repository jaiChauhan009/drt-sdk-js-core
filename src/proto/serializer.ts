import * as errors from "../errors";
import { bigIntToBuffer } from "../smartcontracts/codec/utils";
import { Transaction } from "../transaction";
import { proto } from "./compiled";
import { TRANSACTION_OPTIONS_DEFAULT, TRANSACTION_OPTIONS_TX_GUARDED } from "../constants";
import { Address } from "../address";
import { IAddress, ITransactionValue } from "../interface";
import BigNumber from "bignumber.js";

/**
 * Hides away the serialization complexity, for each type of object (e.g. transactions).
 
 * The implementation is non-generic, but practical: there's a pair of `serialize` / `deserialize` method for each type of object.
 */
export class ProtoSerializer {
    /**
     * Serializes a Transaction object to a Buffer. Handles low-level conversion logic and field-mappings as well.
     */
    serializeTransaction(transaction: Transaction): Buffer {
        const receiverPubkey = new Address(transaction.getReceiver().bech32()).pubkey();
        const senderPubkey = new Address(transaction.getSender().bech32()).pubkey();

        let protoTransaction = new proto.Transaction({
            // elrond-go's serializer handles nonce == 0 differently, thus we treat 0 as "undefined".
            Nonce: transaction.getNonce().valueOf() ? transaction.getNonce().valueOf() : undefined,
            Value: this.serializeTransactionValue(transaction.getValue()),
            RcvAddr: receiverPubkey,
            RcvUserName: null,
            SndAddr: senderPubkey,
            SndUserName: null,
            GasPrice: transaction.getGasPrice().valueOf(),
            GasLimit: transaction.getGasLimit().valueOf(),
            Data: transaction.getData().length() == 0 ? null : transaction.getData().valueOf(),
            ChainID: Buffer.from(transaction.getChainID().valueOf()),
            Version: transaction.getVersion().valueOf(),
            Signature: Buffer.from(transaction.getSignature().hex(), "hex")
        });

        if (transaction.getOptions().valueOf() !== TRANSACTION_OPTIONS_DEFAULT) {
            protoTransaction.Options = transaction.getOptions().valueOf();
        }

        if (transaction.isGuardedTransaction()) {
            const guardianAddress = transaction.getGuardian();
            protoTransaction.GuardAddr = new Address(guardianAddress.bech32()).pubkey();
            protoTransaction.GuardSignature = Buffer.from(transaction.getGuardianSignature().hex(), "hex");
        }

        const encoded = proto.Transaction.encode(protoTransaction).finish();
        const buffer = Buffer.from(encoded);

        return buffer;
    }

    /**
     * Custom serialization, compatible with elrond-go.
     */
    private serializeTransactionValue(transactionValue: ITransactionValue): Buffer {
        let value = new BigNumber(transactionValue.toString());
        if (value.isZero()) {
            return Buffer.from([0, 0]);
        }

        // Will retain the magnitude, as a buffer.
        let buffer = bigIntToBuffer(value);
        // We prepend the "positive" sign marker, in order to be compatible with Elrond Go's "sign & magnitude" proto-representation (a custom one).
        buffer = Buffer.concat([Buffer.from([0x00]), buffer]);
        return buffer;
    }

    deserializeTransaction(_buffer: Buffer): Transaction {
        // Not needed (yet).
        throw new errors.ErrUnsupportedOperation("deserializeTransaction");
    }
}
