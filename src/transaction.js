const CryptoJS = require('crypto-js');

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
    //uTxOutId unspend transaction out id
    //uTxOutIndex unspend transzction out index
    //Signature

}

class Transaction {
    // ID
    // txInx[5, 5]
    // txOuts[10] 인풋을 합쳐서 하나의 아웃풋을 만든다.
}

//unspend transaction output
class UTxOut{
    constructor(uTxOutId, uTxOutIndex, address, amount){
        this.uTxOutId = uTxOutId;
        this.uTxOutIndex = uTxOutIndex;
        this.address = address;
        this.amount = amount;
    }
}

//unspend transaction output array
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
