import BigNumber from "bignumber.js";
import { assert } from "chai";
import { ESDT_CONTRACT_ADDRESS } from "../constants";
import { loadTestWallets, TestWallet } from "../testutils";
import { TokenManagementTransactionsFactory } from "./tokenManagementTransactionsFactory";
import { TransactionsFactoryConfig } from "./transactionsFactoryConfig";

describe("test token management transactions factory", () => {
    let frank: TestWallet, grace: TestWallet;
    let factory: TokenManagementTransactionsFactory;
    let config: TransactionsFactoryConfig;

    before(async function () {
        ({ frank, grace } = await loadTestWallets());
        config = new TransactionsFactoryConfig("T");
        factory = new TokenManagementTransactionsFactory(config);
    });

    it("should create draft transaction for registering and setting roles", () => {
        const draft = factory.createTransactionForRegisteringAndSettingRoles({
            sender: frank.address,
            tokenName: "TEST",
            tokenTicker: "TEST",
            tokenType: "FNG",
            numDecimals: 2
        });

        assert.deepEqual(draft.data, Buffer.from("registerAndSetAllRoles@54455354@54455354@464e47@02"));
        assert.equal(draft.sender, frank.address.toString());
        assert.equal(draft.receiver, "erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u");
        assert.deepEqual(draft.value, config.issueCost);
        assert.deepEqual(draft.gasLimit, new BigNumber("60125000"));
    });

    it("should create draft transaction for issuing fungible token", () => {
        const draft = factory.createTransactionForIssuingFungible({
            sender: frank.address,
            tokenName: "FRANK",
            tokenTicker: "FRANK",
            initialSupply: 100,
            numDecimals: 0,
            canFreeze: true,
            canWipe: true,
            canPause: true,
            canChangeOwner: true,
            canUpgrade: false,
            canAddSpecialRoles: false
        });

        assert.deepEqual(draft.data, Buffer.from("issue@4652414e4b@4652414e4b@64@@63616e467265657a65@74727565@63616e57697065@74727565@63616e5061757365@74727565@63616e4368616e67654f776e6572@74727565@63616e55706772616465@66616c7365@63616e4164645370656369616c526f6c6573@66616c7365"));
        assert.equal(draft.sender, frank.address.toString());
        assert.equal(draft.receiver, ESDT_CONTRACT_ADDRESS);
        assert.deepEqual(draft.value, config.issueCost);
    });

    it("should create draft transaction for issuing semi-fungible token", () => {
        const draft = factory.createTransactionForIssuingSemiFungible({
            sender: frank.address,
            tokenName: "FRANK",
            tokenTicker: "FRANK",
            canFreeze: true,
            canWipe: true,
            canPause: true,
            canTransferNFTCreateRole: true,
            canChangeOwner: true,
            canUpgrade: false,
            canAddSpecialRoles: false
        });

        assert.deepEqual(draft.data, Buffer.from("issueSemiFungible@4652414e4b@4652414e4b@63616e467265657a65@74727565@63616e57697065@74727565@63616e5061757365@74727565@63616e5472616e736665724e4654437265617465526f6c65@74727565@63616e4368616e67654f776e6572@74727565@63616e55706772616465@66616c7365@63616e4164645370656369616c526f6c6573@66616c7365"));
        assert.equal(draft.sender, frank.address.toString());
        assert.equal(draft.receiver, ESDT_CONTRACT_ADDRESS);
        assert.deepEqual(draft.value, config.issueCost);
    });

    it("should create draft transaction for issuing non-fungible token", () => {
        const draft = factory.createTransactionForIssuingNonFungible({
            sender: frank.address,
            tokenName: "FRANK",
            tokenTicker: "FRANK",
            canFreeze: true,
            canWipe: true,
            canPause: true,
            canTransferNFTCreateRole: true,
            canChangeOwner: true,
            canUpgrade: false,
            canAddSpecialRoles: false
        });

        assert.deepEqual(draft.data, Buffer.from("issueNonFungible@4652414e4b@4652414e4b@63616e467265657a65@74727565@63616e57697065@74727565@63616e5061757365@74727565@63616e5472616e736665724e4654437265617465526f6c65@74727565@63616e4368616e67654f776e6572@74727565@63616e55706772616465@66616c7365@63616e4164645370656369616c526f6c6573@66616c7365"));
        assert.equal(draft.sender, frank.address.toString());
        assert.equal(draft.receiver, ESDT_CONTRACT_ADDRESS);
        assert.deepEqual(draft.value, config.issueCost);
    });

    it("should create draft transaction for registering metaEsdt", () => {
        const draft = factory.createTransactionForRegisteringMetaESDT({
            sender: frank.address,
            tokenName: "FRANK",
            tokenTicker: "FRANK",
            numDecimals: 10,
            canFreeze: true,
            canWipe: true,
            canPause: true,
            canTransferNFTCreateRole: true,
            canChangeOwner: true,
            canUpgrade: false,
            canAddSpecialRoles: false
        });

        assert.deepEqual(draft.data, Buffer.from("registerMetaESDT@4652414e4b@4652414e4b@0a@63616e467265657a65@74727565@63616e57697065@74727565@63616e5061757365@74727565@63616e5472616e736665724e4654437265617465526f6c65@74727565@63616e4368616e67654f776e6572@74727565@63616e55706772616465@66616c7365@63616e4164645370656369616c526f6c6573@66616c7365"));
        assert.equal(draft.sender, frank.address.toString());
        assert.equal(draft.receiver, ESDT_CONTRACT_ADDRESS);
        assert.deepEqual(draft.value, config.issueCost);
    });

    it("should create draft transaction for setting spcial role on non-fungible token", () => {
        const draft = factory.createTransactionForSettingSpecialRoleOnNonFungibleToken({
            sender: frank.address,
            user: grace.address,
            tokenIdentifier: "FRANK-11ce3e",
            addRoleNFTCreate: true,
            addRoleNFTBurn: false,
            addRoleNFTUpdateAttributes: true,
            addRoleNFTAddURI: true,
            addRoleESDTTransferRole: false
        });

        assert.deepEqual(draft.data, Buffer.from("setSpecialRole@4652414e4b2d313163653365@1e8a8b6b49de5b7be10aaa158a5a6a4abb4b56cc08f524bb5e6cd5f211ad3e13@45534454526f6c654e4654437265617465@45534454526f6c654e465455706461746541747472696275746573@45534454526f6c654e4654416464555249"));
        assert.equal(draft.sender, frank.address.toString());
        assert.equal(draft.receiver, ESDT_CONTRACT_ADDRESS);
        assert.equal(draft.value, 0);
    });

    it("should create draft transaction for creating nft", () => {
        const draft = factory.createTransactionForCreatingNFT({
            sender: grace.address,
            tokenIdentifier: "FRANK-aa9e8d",
            initialQuantity: 1,
            name: "test",
            royalties: 1000,
            hash: "abba",
            attributes: Buffer.from("test"),
            uris: ["a", "b"]
        });

        assert.deepEqual(draft.data, Buffer.from("ESDTNFTCreate@4652414e4b2d616139653864@01@74657374@03e8@61626261@74657374@61@62"));
        assert.equal(draft.sender, grace.address.toString());
        assert.equal(draft.receiver, grace.address.toString());
        assert.equal(draft.value, 0);
    });
});
