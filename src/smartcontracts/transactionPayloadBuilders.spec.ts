import { assert } from "chai";
import { Address } from "../address";
import { Code } from "./code";
import { CodeMetadata } from "./codeMetadata";
import { ContractFunction } from "./function";
import {
    ContractCallPayloadBuilder,
    ContractDeployPayloadBuilder,
    ContractUpgradePayloadBuilder,
} from "./transactionPayloadBuilders";
import { AddressValue, U32Value } from "./typesystem";

describe("test contract payload builders", () => {
    it("should prepare deploy correctly", async () => {
        let payload = new ContractDeployPayloadBuilder()
            .setCode(Code.fromBuffer(Buffer.from([1, 2, 3, 4])))
            .setCodeMetadata(new CodeMetadata(true, false, true))
            .addInitArg(new U32Value(1024))
            .build();

        assert.equal(payload.valueOf().toString(), "01020304@0500@0102@0400");
    });

    it("should prepare upgrade correctly", async () => {
        let payload = new ContractUpgradePayloadBuilder()
            .setCode(Code.fromBuffer(Buffer.from([1, 2, 3, 4])))
            .setCodeMetadata(new CodeMetadata(true, false, true))
            .addInitArg(new U32Value(1024))
            .build();

        assert.equal(payload.valueOf().toString(), "upgradeContract@01020304@0102@0400");
    });

    it("should prepare call correctly", async () => {
        let alice = new Address("drt1l453hd0gt5gzdp7czpuall8ggt2dcv5zwmfdf3sd3lguxseux2fsxvluwu");
                                
        let payload = new ContractCallPayloadBuilder()
            .setFunction(new ContractFunction("transferToken"))
            .addArg(new AddressValue(alice))
            .addArg(new U32Value(1024))
            .build();

        assert.equal(
            payload.valueOf().toString(),
            "transferToken@fd691bb5e85d102687d81079dffce842d4dc328276d2d4c60d8fd1c3433c3293@0400",
        );
    });
});
