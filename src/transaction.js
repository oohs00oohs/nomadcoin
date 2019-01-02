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
    //uTxOutId unspent transaction out id
    //uTxOutIndex unspent transzction out index
    //Signature

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

//unspent transaction output array
let uTxOuts = [];


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
const signTxIn = (tx, txInIndex, privateKey, uTxOut) => {
    const txIn = tx.txIns[txInIndex];
    const dataToSign = tx.id;
    // To Do : Find Tx
    const referencedUTxOut = findUTxOut(txIn.txOutId, tx.txOutIndex, uTxOuts);
    if(referencedUTxOut === null){
        return;
    }
    const key = ec.keyFromPrivate(privateKey, "hex");
    const signature = utils.toHexString(key.sign(dataToSign).toDER());
    return signature;
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
        return false;
    }else if(typeof txIn.signature !== "string"){
        return false;
    }else if(typeof txIn.txOutId !== "string"){
        return false;
    }else if(typeof txIn.txOutIndex !== "number"){
        return false;
    }else{
        return true;
    }
}

const isAddressValid = (address) => {
    if(address.length !== 130){
        return false;
    }else if(address.match("^[a-fA-F0-9]+$") === null){
        return false;
    }else if(!address.startsWith("04")){
        return false;
    }else{
        return true;
    }
}

const isTxOutStructureValid = (txOut) => {
    if(txOut === null){
        return false;
    }else if(typeof txOut.address !== "string"){
        return false;
    }else if(!isAddressValid(txOut.address)){
        return false;
    }else if(typeof txOut.amount !== "number"){
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
        return false;
    }

    if(getTxId(tx) !== tx.id){
        return false;
    }

    const hasValidTxIns = tx.txIns.map(txIn => validateTxIn(txIn, tx, uTxOutList));

    if(!hasValidTxIns){
        return false;
    }

    const amountInTxIns = tx.txIns
        .map(txIn => getAmountInTxIn(txIn, uTxOutList))
        .reduce((a, b) => a + b, 0);

    const amountInTxOuts = tx.txOuts
        .map(txOut => txOut.amount)
        .reduce((a, b) => a + b, 0);

    if(amountInTxIns !== amountInTxOuts){
        return false;
    }else{
        return true;
    }
}

const validateCoinbaseTx = (tx, blockIndex) => {
    if(getTxId(tx) !== tx.id) {
        return false;
    }else if(tx.txIns.length !== 1){
        return false;
    }else if(tx.txIns[0].txOutIndex !== blockIndex){
        return false;
    }else if(tx.txOuts.length !== 1){
        return false;
    }else if(tx.txOuts[0].amount !== COINBASE_AMOUNT){
        return false;
    }else {
        return true;
    }
}