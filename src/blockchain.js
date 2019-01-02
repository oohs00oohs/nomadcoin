const CryptoJS = require('crypto-js');
const hexToBinary = require('hex-to-binary');

const BLOCK_GENERATION_INTERVAL = 10;//몇분마다 블록이 채굴될지(초단위)
const DIFFICULTY_ADJUSMENT_INTERVAL = 10;//몇개마다 블록의 난이도를 조절할 것인지(갯수)

class Block {
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce){
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

//블록의 시초가 되는 첫번째 블록
const genesisBlock = new Block(
    0,
    '2C4CEB90344F20CC4C77D626247AED3ED530C1AEE3E6E85AD494498B17414CAC',
    null,
    0000000000,
    "This is the genesis!!",
    0,
    0
);

let blockchain = [genesisBlock];

//마지막에 생성된 블록을 가져오는 함수
const getNewestBlock = () => blockchain[blockchain.length -1];

//타임 스탬프를 생성하는 함수
const getTimestamp = () => Math.round(new Date().getTime() / 1000);

const getBlockchain = () => blockchain;

//해쉬를 생성하는 함수
const createHash = (index, previousHash, timestamp, data, difficulty, nonce) => 
    CryptoJS.SHA256(
        index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce
    ).toString();

//새로운 블록을 생성하는 함수
const createNewBlock = data => {
    const previousBlock = getNewestBlock();
    const newBlockIndex = previousBlock.index + 1;
    const newTimestamp = getTimestamp();
    const difficulty = findDiffculty();
    const newBlock = findBlock(
        newBlockIndex,
        previousBlock.hash,
        newTimestamp,
        data,
        difficulty//난이도임
    );
    addBlockToChain(newBlock);
    require("./p2p").broadcastNewBlock();
    return newBlock;
}

const findDiffculty = () => {
    const newestBlock = getNewestBlock();
    if(newestBlock.index % DIFFICULTY_ADJUSMENT_INTERVAL === 0 && newestBlock.index !== 0){
        //마지막 블록의 난이도 조정 주기가 일치하고 제네시스 블록이 아니라면 새로운 난이도를 계한 할 것임
        console.log(calculateNewDifficulty(newestBlock, getBlockchain()));
        return calculateNewDifficulty(newestBlock, getBlockchain());
    }else{
        //마지막 블록의 난이도 조정 주기가 일치하지 않거나 제네시스 블록이라면 난이도 유지
        return newestBlock.difficulty;
    }
}

const calculateNewDifficulty = (newestBlock, blockchain) => {
   const lastCalculatedBlock =
     blockchain[blockchain.length - DIFFICULTY_ADJUSMENT_INTERVAL];
   const timeExpected =
     BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSMENT_INTERVAL;
   const timeTaken = newestBlock.timestamp - lastCalculatedBlock.timestamp;
   if (timeTaken < timeExpected / 2) {
     return lastCalculatedBlock.difficulty + 1;
   } else if (timeTaken > timeExpected * 2) {
     return lastCalculatedBlock.difficulty - 1;
   } else {
     return lastCalculatedBlock.difficulty;
   }
 };

const findBlock = (index, previousHash, timestamp, data, difficulty) => {
    let nonce = 0;
    while(true){
        console.log('current nonce : ' + nonce);
        const hash = createHash(
            index,
            previousHash,
            timestamp,
            data,
            difficulty,
            nonce
        );
        //to do : check amount of zeros (hashMatchesDiffculty)
        if(hashMatchesDiffculty(hash, difficulty)){
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        nonce++;
        
    }
}

const hashMatchesDiffculty = (hash, difficulty) => {
    const hashInBinary = hexToBinary(hash);
    const requiredZeros = "0".repeat(difficulty);
    console.log('Trying diffculty:', difficulty, 'with hash', hashInBinary);
    return hashInBinary.startsWith(requiredZeros);
}

const getBlockHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);

const isTimeStampValid = (newBlock, oldBlock) => {
    return (
        oldBlock.timestamp - 60 < newBlock.timestamp && 
        newBlock.timestamp - 60 < getTimestamp()
    );
}

//생성된 블록을 검증하는 함수
const isBlockValid = (candidateBlack, latestBlock) => {
    if(!isBlockStructrueValid(candidateBlack)){
        //새로 등록될 블록의 구조를 검증
        console.log('The candidate block structure is not valid');
        return false;
    }else if(latestBlock.index + 1 !== candidateBlack.index){
        //새로 등록될 블록의 인덱스가 마지막 블록의 인덱스 + 1과 일치해야 한다
        console.log('the candidate block doesnt have a valid index');
        return false;
    }else if(latestBlock.hash !== candidateBlack.previousHash){
        //새로 등록될 블록의 해쉬가 마지막 블록의 해쉬와 일치해야 한다.
        console.log('The previousHash of the candidate block is not the hash of the latest block');
        return false;
    }else if(getBlockHash(candidateBlack) !== candidateBlack.hash){
        console.log('The has of this block is invalid');
        return false;
    } else if(!isTimeStampValid(candidateBlack, latestBlock)) {
        console.log('The timestamp of this is dodgy');
        return false;
    }
    return true;
}

//생성된 블록의 구조를 검증하는 함수
const isBlockStructrueValid = (block) => {
    return (
        typeof block.index === 'number' && 
        typeof block.hash === 'string' &&
        typeof block.previousHash === 'string' &&
        typeof block.timestamp === 'number' &&
        typeof block.data === 'string'
    )
}

//블록체인을 검증하는 함수
const isChainValid = (candidateChain) => {
    /**
     * 첫번째로 블록체인은 같은 하나의 제네시스 블록 출신이여야 한다.
     */
    const isGenesisValid = block => {
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    }

    if(!isGenesisValid(candidateChain[0])){
        //후보체인의 0번째 블록(제네시스블록)이 같은 블록인지 검증
        console.log('The candidateChains s genesisBlock is not the same as our genesisBlock');
        return false;
    }

    //때때로 블록체인을 교체하기도 하기 때문에 새로운 체인의 블록을 모두 검증해야 한다. 제네시스 블록은 동일 블록인지 위에서 체크했기 때문에 인덱스 1부터 시작한다.
    for(let i = 1; i< candidateChain.length; i++){
        if(!isBlockValid(candidateChain[i], candidateChain[i-1])){
            return false;
        }
    }
    
    return true;
}

const sumDifficulty = anyBlockchain => 
    anyBlockchain
    .map(boock => block.difficulty)
    .map(difficulty => Math.pow(difficulty, 2))
    .reduce((a, b) => a + b)
    ;

//블록체인을 교체하기 위한 함수
const replaceChain = candidateChain => {
    //새로운 체인의 길이가 더 길다면 교체한다 항상 더 긴 블록체인을 원하기 때문에
    if(isChainValid(candidateChain) && sumDifficulty(candidateChain) > sumDifficulty(getBlockchain())){
        blockchain = candidateChain;
        return true;
    }else{
        return false;
    }
};

//새로운 블록을 체인에 추가하는 함수
const addBlockToChain = candidateBlock => {
    if(isBlockValid(candidateBlock, getNewestBlock())){
        blockchain.push(candidateBlock);
        return true;
    }else{
        return false;
    }
}

module.exports = {
    getBlockchain,
    createNewBlock,
    getNewestBlock,
    isBlockStructrueValid,
    addBlockToChain,
    replaceChain
}