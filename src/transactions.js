const CryptoJS = require('crypto-js'),
    elliptic = require('elliptic'),
    utils = require("./utils");

const ec = new elliptic.ec('secp256k1');

const COINBASE_AMOUNT = 50;


//거래에 관한 클래스임

//트랜젝션의 아웃풋
class TxOut {
    constructor(address, amount){
        this.address = address;
        this.amount = amount;
    }
}

//트랜잭션의 인풋
class TxIn {
    // txOutId
    // txOutIndex
    // Signature

}

class Transaction {
    // ID
    // txInx[5, 5]
    // txOuts[10] 인풋을 합쳐서 하나의 아웃풋을 만든다.
}

//unspent transaction output
class UTxOut{
    constructor(txOutId, txOutIndex, address, amount){
        this.txOutId = uTxOutId;
        this.txOutIndex = uTxOutIndex;
        this.address = address;
        this.amount = amount;
    }
}




//트랜잭션의 ID를 generation하는 함수
const getTxId = tx => {
    //transaction input content
    const txInsContent = tx.txIns
        .map(txIn => txIn.uTxOutId + txIn.uTxOutIndex)
        .reeduce((a, b) => a + b, "");

    const txOutContent = tx.txOuts
        .map(txOut => txOut.address + txOut.amount)
        .reduce((a, b) => a + b , "");
    
    return CryptoJS.SHA256(txInsContent + txOutContent).toString();
}

const findUTxOut = (txOutId, txOutIndex, uTxOutList) => {
    return uTxOutList.find(
        uTxO => uTxO.txOutId === uTxOutId && uTxO.txOutIndex === txOutIndex
    );
}

//트랜잭션 인풋에 서명을 추가하는 함수
//4가지의 매개변수가 필요함
const signTxIn = (tx, txInIndex, privateKey, uTxOutList) => {
    const txIn = tx.txIns[txInIndex];
    const dataToSign = tx.id;
    // To Do : Find Tx
    const referencedUTxOut = findUTxOut(txIn.txOutId, tx.txOutIndex, uTxOutsList);
    if(referencedUTxOut === null){
        console.log("Couldn't find the referenced uTxOut, not singing");
        return;
    }
    const referencedAddress = referencedUTxOut.address;
    if(getPublicKey(privateKey) !== referencedAddress){
        return false;
    }
    const key = ec.keyFromPrivate(privateKey, "hex");
    const signature = utils.toHexString(key.sign(dataToSign).toDER());
    return signature;
}

const getPublicKey = (privateKey) => {
    return ec.keyFromPrivate(privateKey, "hex")
        .getPublic()
        .encode("hex");
}


//트랜잭션의 아웃풋은 사용되지 않은 트랜잭션의 인풋이다 만약에 트랜잭션의 인풋이 아웃풋으로 사용되었다면
//트랜잭션의 인풋을 삭제한다.(맞는지 모르겠음 ㅋㅋㅋ)
const updateUTxOuts = (newUTxs, uTxOutList) => {
    const newUTxOuts = newTxs.map(tx => {
        tx.txOuts.map((txOut, index) => {
            new UTxOut(tx.id, index, txOut.address, txOut.amount);
        });
    })
    .reduce((a, b) => a.concat(b), []);

    const spentTxOuts = newTxs
        .map(tx => tx.txIns)
        .reduce((a, b) => a.concat(b), [])
        .map(txIn => new UTxOut(txIn.txOutId, txIn.txOutIndex, "", 0));

    const resultingUTxOuts = uTxOutList.filter(
        uTxO => !findUTxOut(uTxO.txOutId, uTxO.txOutIndex, spentTxOuts)
    )
    .concat(newUTxOuts);

    return resultingUTxOuts;
};

//트랜잭션도 마찬가지로 유효성 검증을 해야한다.
const isTxInStructureValid = (txIn) => {
    if(txIn === null){
        console.log("The txIn appears to be null");
        return false;
    }else if(typeof txIn.signature !== "string"){
        console.log("The txIn doesn't have a valid signature");
        return false;
    }else if(typeof txIn.txOutId !== "string"){
        console.log("The txin doesn't have a valid txOutIn");
        return false;
    }else if(typeof txIn.txOutIndex !== "number"){
        console.log("The txIn doesn't have a valid txOutIndex");
        return false;
    }else{
        return true;
    }
}

const isAddressValid = (address) => {
    if(address.length !== 130){
        console.log("The address length is not the expected one");
        return false;
    }else if(address.match("^[a-fA-F0-9]+$") === null){
        console.log("The address doesn't match the hex pattern");
        return false;
    }else if(!address.startsWith("04")){
        console.log("The address doesn't start with 04");
        return false;
    }else{
        return true;
    }
}

const isTxOutStructureValid = (txOut) => {
    if(txOut === null){
        console.log("The txOut appears to be null");
        return false;
    }else if(typeof txOut.address !== "string"){
        console.log("The txOut doesn't have a valid string as address");
        return false;
    }else if(!isAddressValid(txOut.address)){
        console.log("The txOut doesn't have a valid address");
        return false;
    }else if(typeof txOut.amount !== "number"){
        console.log("The txOut doesn't have a valiod amount");
        return false;
    }else {
        return true;
    }
}

const isTxStructureValid = (tx) => {
    if(typeof tx.id !== "string"){
        console.log('Tx ID is not valid');
        return false;
    }else if(!(tx.txIns instanceof Array)){
        console.log('The txIns are not an array');
        return false;
    }else if(!tx.txIns.map(isTxInStructureValid).reduce((a, b) => a && b, true)) {
        console.log("The structure of one of the txIn is not valid");
        return false;
    }else if(!(tx.txOuts instanceof Array)) {
        console.log("The txOuts are not an array");
        return false;
    }else if(!tx.txOut.map(isTxOutStructureValid).reduce((a, b) => a && b , true)) {
        console.log("The structure of one of the txOut is not valid");
        return false;
    }else {
        return true;
    }
}

const validateTxIn = (txIn, tx, uTxOutList) => {
    const wantedTxOut = uTxOutList.find(uTxO => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
    if(wantedTxOut === null){
        console.log(`Didn't find the wanted uTxOut, the tx: ${tx} is invalid`);
        return false;
    }else{
        const address = wantedTxOut.address;
        const key = ec.keyFromPublic(address, "hex");
        return key.verify(tx.id, txIn.signature);
    }
}

const getAmountInTxIn = (txIn, uTxOutList) =>
    findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount;

const validateTx = (tx, uTxOutList) => {

    if(!isTxStructureValid(tx)){
        console.log("Tx structure is invalid");
        return false;
    }

    if(getTxId(tx) !== tx.id){
        console.log("Tx ID is not invalid");
        return false;
    }

    const hasValidTxIns = tx.txIns.map(txIn => validateTxIn(txIn, tx, uTxOutList));

    if(!hasValidTxIns){
        console.log(`The tx : ${tx} doesn't have valid txIns`);
        return false;
    }

    const amountInTxIns = tx.txIns
        .map(txIn => getAmountInTxIn(txIn, uTxOutList))
        .reduce((a, b) => a + b, 0);

    const amountInTxOuts = tx.txOuts
        .map(txOut => txOut.amount)
        .reduce((a, b) => a + b, 0);

    if(amountInTxIns !== amountInTxOuts){
        console.log(
            `The tx : ${tx} doesn't have the same amount in the txOut as in the txIns`
        );
        return false;
    }else{
        return true;
    }
}

const validateCoinbaseTx = (tx, blockIndex) => {
    if(getTxId(tx) !== tx.id) {
        console.log("Invalid Coinbase tx ID");
        return false;
    }else if(tx.txIns.length !== 1){
        console.log("Coinbase Tx should only have one input");
        return false;
    }else if(tx.txIns[0].txOutIndex !== blockIndex){
        console.log(
            "The txOutIndex of the Coinbase Tx should be the same as the Block Index"
        );
        return false;
    }else if(tx.txOuts.length !== 1){
        console.log("Coinbase TX should only have one output");
        return false;
    }else if(tx.txOuts[0].amount !== COINBASE_AMOUNT){
        console.log(
            `Coinbase TX should have an amount of only ${COINBASE_AMOUNT} and it has ${
                tx.txOuts[0].amount
            }`
        );
        return false;
    }else {
        return true;
    }
}

module.exports = {
    getPublicKey,
    getTxId,
    signTxIn,
    TxIn,
    Transaction,
    TxOut
}