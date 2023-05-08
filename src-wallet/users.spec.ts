import { assert } from "chai";
import { Randomness } from "./crypto";
import { ErrInvariantFailed } from "./errors";
import { Mnemonic } from "./mnemonic";
import { TestMessage } from "./testutils/message";
import { TestTransaction } from "./testutils/transaction";
import { DummyMnemonic, DummyMnemonicOf12Words, DummyPassword, loadTestKeystore, loadTestWallet, TestWallet } from "./testutils/wallets";
import { UserSecretKey } from "./userKeys";
import { UserSigner } from "./userSigner";
import { UserVerifier } from "./userVerifier";
import { UserWallet } from "./userWallet";

describe("test user wallets", () => {
    let alice: TestWallet, bob: TestWallet, carol: TestWallet;
    let password: string = DummyPassword;

    before(async function () {
        alice = await loadTestWallet("alice");
        bob = await loadTestWallet("bob");
        carol = await loadTestWallet("carol");
    });

    it("should generate mnemonic", () => {
        let mnemonic = Mnemonic.generate();
        let words = mnemonic.getWords();
        assert.lengthOf(words, 24);
    });

    it("should derive keys", async () => {
        let mnemonic = Mnemonic.fromString(DummyMnemonic);

        assert.equal(mnemonic.deriveKey(0).hex(), alice.secretKeyHex);
        assert.equal(mnemonic.deriveKey(1).hex(), bob.secretKeyHex);
        assert.equal(mnemonic.deriveKey(2).hex(), carol.secretKeyHex);
    });

    it("should derive keys (12 words)", async () => {
        const mnemonic = Mnemonic.fromString(DummyMnemonicOf12Words);

        assert.equal(mnemonic.deriveKey(0).generatePublicKey().toAddress().bech32(), "erd1l8g9dk3gz035gkjhwegsjkqzdu3augrwhcfxrnucnyyrpc2220pqg4g7na");
        assert.equal(mnemonic.deriveKey(1).generatePublicKey().toAddress().bech32(), "erd1fmhwg84rldg0xzngf53m0y607wvefvamh07n2mkypedx27lcqnts4zs09p");
        assert.equal(mnemonic.deriveKey(2).generatePublicKey().toAddress().bech32(), "erd1tyuyemt4xz2yjvc7rxxp8kyfmk2n3h8gv3aavzd9ru4v2vhrkcksptewtj");
    });

    it("should create secret key", () => {
        let keyHex = alice.secretKeyHex;
        let fromBuffer = new UserSecretKey(Buffer.from(keyHex, "hex"));
        let fromHex = UserSecretKey.fromString(keyHex);

        assert.equal(fromBuffer.hex(), keyHex);
        assert.equal(fromHex.hex(), keyHex);
    });

    it("should compute public key (and address)", () => {
        let secretKey: UserSecretKey;

        secretKey = new UserSecretKey(Buffer.from(alice.secretKeyHex, "hex"));
        assert.equal(secretKey.generatePublicKey().hex(), alice.address.hex());
        assert.deepEqual(secretKey.generatePublicKey().toAddress(), alice.address);

        secretKey = new UserSecretKey(Buffer.from(bob.secretKeyHex, "hex"));
        assert.equal(secretKey.generatePublicKey().hex(), bob.address.hex());
        assert.deepEqual(secretKey.generatePublicKey().toAddress(), bob.address);

        secretKey = new UserSecretKey(Buffer.from(carol.secretKeyHex, "hex"));
        assert.equal(secretKey.generatePublicKey().hex(), carol.address.hex());
        assert.deepEqual(secretKey.generatePublicKey().toAddress(), carol.address);
    });

    it("should throw error when invalid input", () => {
        assert.throw(() => new UserSecretKey(Buffer.alloc(42)), ErrInvariantFailed);
        assert.throw(() => UserSecretKey.fromString("foobar"), ErrInvariantFailed);
    });

    it("should handle PEM files", () => {
        assert.equal(UserSecretKey.fromPem(alice.pemFileText).hex(), alice.secretKeyHex);
        assert.equal(UserSecretKey.fromPem(bob.pemFileText).hex(), bob.secretKeyHex);
        assert.equal(UserSecretKey.fromPem(carol.pemFileText).hex(), carol.secretKeyHex);
    });

    it("should create and load keystore files (with secret keys)", function () {
        this.timeout(10000);

        let aliceSecretKey = UserSecretKey.fromString(alice.secretKeyHex);
        let bobSecretKey = UserSecretKey.fromString(bob.secretKeyHex);
        let carolSecretKey = UserSecretKey.fromString(carol.secretKeyHex);

        console.time("encrypt");
        let aliceKeyFile = UserWallet.fromSecretKey({ secretKey: aliceSecretKey, password: password });
        let bobKeyFile = UserWallet.fromSecretKey({ secretKey: bobSecretKey, password: password });
        let carolKeyFile = UserWallet.fromSecretKey({ secretKey: carolSecretKey, password: password });
        console.timeEnd("encrypt");

        assert.equal(aliceKeyFile.toJSON().bech32, alice.address.bech32());
        assert.equal(bobKeyFile.toJSON().bech32, bob.address.bech32());
        assert.equal(carolKeyFile.toJSON().bech32, carol.address.bech32());

        console.time("decrypt");
        assert.deepEqual(UserWallet.decryptSecretKey(aliceKeyFile.toJSON(), password), aliceSecretKey);
        assert.deepEqual(UserWallet.decryptSecretKey(bobKeyFile.toJSON(), password), bobSecretKey);
        assert.deepEqual(UserWallet.decryptSecretKey(carolKeyFile.toJSON(), password), carolSecretKey);
        console.timeEnd("decrypt");

        // With provided randomness, in order to reproduce our development wallets

        aliceKeyFile = UserWallet.fromSecretKey({
            secretKey: aliceSecretKey,
            password: password,
            randomness: new Randomness({
                id: alice.keyFileObject.id,
                iv: Buffer.from(alice.keyFileObject.crypto.cipherparams.iv, "hex"),
                salt: Buffer.from(alice.keyFileObject.crypto.kdfparams.salt, "hex")
            })
        });

        bobKeyFile = UserWallet.fromSecretKey({
            secretKey: bobSecretKey,
            password: password,
            randomness: new Randomness({
                id: bob.keyFileObject.id,
                iv: Buffer.from(bob.keyFileObject.crypto.cipherparams.iv, "hex"),
                salt: Buffer.from(bob.keyFileObject.crypto.kdfparams.salt, "hex")
            })
        });

        carolKeyFile = UserWallet.fromSecretKey({
            secretKey: carolSecretKey,
            password: password,
            randomness: new Randomness({
                id: carol.keyFileObject.id,
                iv: Buffer.from(carol.keyFileObject.crypto.cipherparams.iv, "hex"),
                salt: Buffer.from(carol.keyFileObject.crypto.kdfparams.salt, "hex")
            })
        });

        assert.deepEqual(aliceKeyFile.toJSON(), alice.keyFileObject);
        assert.deepEqual(bobKeyFile.toJSON(), bob.keyFileObject);
        assert.deepEqual(carolKeyFile.toJSON(), carol.keyFileObject);
    });

    it("should load keystore files (with secret keys, but without 'kind' field)", async function () {
        const keyFileObject = await loadTestKeystore("withoutKind.json");
        const secretKey = UserWallet.decryptSecretKey(keyFileObject, password);

        assert.equal(secretKey.generatePublicKey().toAddress().bech32(), "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th");
    });

    it("should create and load keystore files (with mnemonics)", async function () {
        this.timeout(10000);

        const wallet = UserWallet.fromMnemonic({ mnemonic: DummyMnemonic, password: password });
        const json = wallet.toJSON();

        assert.equal(json.version, 4);
        assert.equal(json.kind, "mnemonic");
        assert.isUndefined(json.bech32);

        const mnemonic = UserWallet.decryptMnemonic(json, password);
        const mnemonicText = mnemonic.toString();

        assert.equal(mnemonicText, DummyMnemonic);
        assert.equal(mnemonic.deriveKey(0).generatePublicKey().toAddress().bech32(), alice.address.bech32());
        assert.equal(mnemonic.deriveKey(1).generatePublicKey().toAddress().bech32(), bob.address.bech32());
        assert.equal(mnemonic.deriveKey(2).generatePublicKey().toAddress().bech32(), carol.address.bech32());

        // With provided randomness, in order to reproduce our test wallets
        const expectedDummyWallet = await loadTestKeystore("withDummyMnemonic.json");
        const dummyWallet = UserWallet.fromMnemonic({
            mnemonic: DummyMnemonic,
            password: password,
            randomness: new Randomness({
                id: "5b448dbc-5c72-4d83-8038-938b1f8dff19",
                iv: Buffer.from("2da5620906634972d9a623bc249d63d4", "hex"),
                salt: Buffer.from("aa9e0ba6b188703071a582c10e5331f2756279feb0e2768f1ba0fd38ec77f035", "hex")
            })
        });

        assert.deepEqual(dummyWallet.toJSON(), expectedDummyWallet);
    });

    it("should loadSecretKey, but without 'kind' field", async function () {
        const keyFileObject = await loadTestKeystore("withoutKind.json");
        const secretKey = UserWallet.loadSecretKey(keyFileObject, password);

        assert.equal(secretKey.generatePublicKey().toAddress().bech32(), "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th");
    });

    it("should throw when calling loadSecretKey with unecessary address index", async function () {
        const keyFileObject = await loadTestKeystore("alice.json");

        assert.throws(() => UserWallet.loadSecretKey(keyFileObject, password, 42), "addressIndex must not be provided when kind == 'secretKey'");
    });

    it("should loadSecretKey with mnemonic", async function () {
        const keyFileObject = await loadTestKeystore("withDummyMnemonic.json");

        assert.equal(UserWallet.loadSecretKey(keyFileObject, password, 0).generatePublicKey().toAddress().bech32(), "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th");
        assert.equal(UserWallet.loadSecretKey(keyFileObject, password, 1).generatePublicKey().toAddress().bech32(), "erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx");
        assert.equal(UserWallet.loadSecretKey(keyFileObject, password, 2).generatePublicKey().toAddress().bech32(), "erd1k2s324ww2g0yj38qn2ch2jwctdy8mnfxep94q9arncc6xecg3xaq6mjse8");
    });

    it("should sign transactions", async () => {
        let signer = new UserSigner(UserSecretKey.fromString("1a927e2af5306a9bb2ea777f73e06ecc0ac9aaa72fb4ea3fecf659451394cccf"));
        let verifier = new UserVerifier(UserSecretKey.fromString("1a927e2af5306a9bb2ea777f73e06ecc0ac9aaa72fb4ea3fecf659451394cccf").generatePublicKey());

        // With data field
        let transaction = new TestTransaction({
            nonce: 0,
            value: "0",
            receiver: "erd1cux02zersde0l7hhklzhywcxk4u9n4py5tdxyx7vrvhnza2r4gmq4vw35r",
            gasPrice: 1000000000,
            gasLimit: 50000,
            data: "foo",
            chainID: "1",
        });

        let serialized = transaction.serializeForSigning();
        let signature = await signer.sign(serialized);

        assert.equal(serialized.toString(), `{"nonce":0,"value":"0","receiver":"erd1cux02zersde0l7hhklzhywcxk4u9n4py5tdxyx7vrvhnza2r4gmq4vw35r","sender":"","gasPrice":1000000000,"gasLimit":50000,"data":"Zm9v","chainID":"1","version":1}`);
        assert.equal(signature.toString("hex"), "a3b61a2fe461f3393c42e6cb0477a6b52ffd92168f10c111f6aa8d0a310ee0c314fae0670f8313f1ad992933ac637c61a8ff20cc20b6a8b2260a4af1a120a70d");
        assert.isTrue(verifier.verify(serialized, signature));
        // Without data field
        transaction = new TestTransaction({
            nonce: 8,
            value: "10000000000000000000",
            receiver: "erd1cux02zersde0l7hhklzhywcxk4u9n4py5tdxyx7vrvhnza2r4gmq4vw35r",
            gasPrice: 1000000000,
            gasLimit: 50000,
            chainID: "1"
        });

        serialized = transaction.serializeForSigning();
        signature = await signer.sign(serialized);

        assert.equal(serialized.toString(), `{"nonce":8,"value":"10000000000000000000","receiver":"erd1cux02zersde0l7hhklzhywcxk4u9n4py5tdxyx7vrvhnza2r4gmq4vw35r","sender":"","gasPrice":1000000000,"gasLimit":50000,"chainID":"1","version":1}`);
        assert.equal(signature.toString("hex"), "f136c901d37349a7da8cfe3ab5ec8ef333b0bc351517c0e9bef9eb9704aed3077bf222769cade5ff29dffe5f42e4f0c5e0b068bdba90cd2cb41da51fd45d5a03");
    });

    it("guardian should sign transactions from PEM", async () => {
        // bob is the guardian
        let signer = new UserSigner(UserSecretKey.fromString("1a927e2af5306a9bb2ea777f73e06ecc0ac9aaa72fb4ea3fecf659451394cccf"));
        let verifier = new UserVerifier(UserSecretKey.fromString("1a927e2af5306a9bb2ea777f73e06ecc0ac9aaa72fb4ea3fecf659451394cccf").generatePublicKey());
        let guardianSigner = new UserSigner(UserSecretKey.fromPem(bob.pemFileText));

        // With data field
        let transaction = new TestTransaction({
            nonce: 0,
            value: "0",
            receiver: "erd1cux02zersde0l7hhklzhywcxk4u9n4py5tdxyx7vrvhnza2r4gmq4vw35r",
            sender: "erd1l453hd0gt5gzdp7czpuall8ggt2dcv5zwmfdf3sd3lguxseux2fsmsgldz",
            gasPrice: 1000000000,
            gasLimit: 50000,
            data: "foo",
            chainID: "1",
            guardian: "erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx",
            options: 2,
            version: 2
        });

        let serialized = transaction.serializeForSigning();
        let signature = await signer.sign(serialized);
        let guardianSignature = await guardianSigner.sign(serialized);

        assert.equal(serialized.toString(), `{"nonce":0,"value":"0","receiver":"erd1cux02zersde0l7hhklzhywcxk4u9n4py5tdxyx7vrvhnza2r4gmq4vw35r","sender":"erd1l453hd0gt5gzdp7czpuall8ggt2dcv5zwmfdf3sd3lguxseux2fsmsgldz","guardian":"erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx","gasPrice":1000000000,"gasLimit":50000,"data":"Zm9v","chainID":"1","options":2,"version":2}`);
        assert.equal(signature.toString("hex"), "00b867ae749616954711ef227c0a3f5c6556246f26dbde12ad929a099094065341a0fae7c5ced98e6bdd100ce922c975667444ea859dce9597b46e63cade2a03");
        assert.equal(guardianSignature.toString("hex"), "1326e44941ef7bfbad3edf346e72abe23704ee32b4b6a6a6a9b793bd7c62b6d4a69d3c6ea2dddf7eabc8df8fe291cd24822409ab9194b6a0f3bbbf1c59b0a10f");
        assert.isTrue(verifier.verify(serialized, signature));

        // Without data field
        transaction = new TestTransaction({
            nonce: 8,
            value: "10000000000000000000",
            receiver: "erd1cux02zersde0l7hhklzhywcxk4u9n4py5tdxyx7vrvhnza2r4gmq4vw35r",
            sender: "erd1l453hd0gt5gzdp7czpuall8ggt2dcv5zwmfdf3sd3lguxseux2fsmsgldz",
            gasPrice: 1000000000,
            gasLimit: 50000,
            chainID: "1",
            guardian: "erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx",
            options: 2,
            version: 2,
        });

        serialized = transaction.serializeForSigning();
        signature = await signer.sign(serialized);
        guardianSignature = await guardianSigner.sign(serialized);

        assert.equal(serialized.toString(), `{"nonce":8,"value":"10000000000000000000","receiver":"erd1cux02zersde0l7hhklzhywcxk4u9n4py5tdxyx7vrvhnza2r4gmq4vw35r","sender":"erd1l453hd0gt5gzdp7czpuall8ggt2dcv5zwmfdf3sd3lguxseux2fsmsgldz","guardian":"erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx","gasPrice":1000000000,"gasLimit":50000,"chainID":"1","options":2,"version":2}`);
        assert.equal(signature.toString("hex"), "49a63fa0e3cfb81a2b6d926c741328fb270ea4f58fa32585fe8aa3cde191245e5a13c5c059d5576f4c05fc24d2534a2124ff79c98d067ce8412c806779066b03");
        assert.equal(guardianSignature.toString("hex"), "4c25a54381bf66576d05f32659d30672b5b0bfbfb6b6aee52290d28cfbc87860637f095f83663a1893d12d0d5a27b2ab3325829ff1f1215b81a7ced8ee5d7203");
        assert.isTrue(verifier.verify(serialized, signature));
    });

    it("should sign transactions using PEM files", async () => {
        const signer = UserSigner.fromPem(alice.pemFileText);

        const transaction = new TestTransaction({
            nonce: 0,
            value: "0",
            receiver: "erd1cux02zersde0l7hhklzhywcxk4u9n4py5tdxyx7vrvhnza2r4gmq4vw35r",
            gasPrice: 1000000000,
            gasLimit: 50000,
            data: "foo",
            chainID: "1"
        });

        const signature = await signer.sign(transaction.serializeForSigning());
        assert.equal(signature.toString("hex"), "ba4fa95fea1402e4876abf1d5a510615aab374ee48bb76f5230798a7d3f2fcae6ba91ba56c6d62e6e7003ce531ff02f219cb7218dd00dd2ca650ba747f19640a");
    });

    it("signs a general message", async function () {
        let signer = new UserSigner(UserSecretKey.fromString("1a927e2af5306a9bb2ea777f73e06ecc0ac9aaa72fb4ea3fecf659451394cccf"));
        let verifier = new UserVerifier(UserSecretKey.fromString("1a927e2af5306a9bb2ea777f73e06ecc0ac9aaa72fb4ea3fecf659451394cccf").generatePublicKey());

        const message = new TestMessage({
            foo: "hello",
            bar: "world"
        });

        const data = message.serializeForSigning();
        const signature = await signer.sign(data);

        assert.isTrue(verifier.verify(data, signature));
        assert.isFalse(verifier.verify(Buffer.from("hello"), signature));
    });

    it("should create UserSigner from wallet", async function () {
        const keyFileObjectWithoutKind = await loadTestKeystore("withoutKind.json");
        const keyFileObjectWithMnemonic = await loadTestKeystore("withDummyMnemonic.json");

        assert.equal(UserSigner.fromWallet(keyFileObjectWithoutKind, password).getAddress().bech32(), "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th");
        assert.equal(UserSigner.fromWallet(keyFileObjectWithMnemonic, password).getAddress().bech32(), "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th");
        assert.equal(UserSigner.fromWallet(keyFileObjectWithMnemonic, password, 0).getAddress().bech32(), "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th");
        assert.equal(UserSigner.fromWallet(keyFileObjectWithMnemonic, password, 1).getAddress().bech32(), "erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx");
        assert.equal(UserSigner.fromWallet(keyFileObjectWithMnemonic, password, 2).getAddress().bech32(), "erd1k2s324ww2g0yj38qn2ch2jwctdy8mnfxep94q9arncc6xecg3xaq6mjse8");
    });
});
