const WebSockets = require("ws");
Blockchain = require("./blockchain");

const {getLastBlock} = Blockchain;
/**
 * p2p서버에 연결되면 가장 먼저 최근 블록을 불러오고
 * 그다음 모든 블록을 불러온다.
 */

// Message Types
const GET_LATEST = "GET_LATEST";
const GET_ALL = "GET_ALL";
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE";

// Message Creators
const getLatest = () => {
    return {
        type : GET_LATEST,
        data : null
    }
}

const getAll = () => {
    return{
        type : GET_ALL,
        data : null
    }
}

const blockchainResponse = (data) => {
    return {
        type : BLOCKCHAIN_RESPONSE,
        data
    }
}

const sockets = [];

const getSockets = () => sockets;

const startP2PServer = server => {
    console.log('wsServer started'); 
    const wsServer = new WebSockets.Server({server});
    wsServer.on("connection", ws => {
        initSocketConnection(ws); 
    });
    console.log("Nomadcoin P2P Server")
}

const initSocketConnection = (ws) => {
    sockets.push(ws);
    handleSocketMessages(ws);
    handleSocketError(ws);
    sendMessage(ws, getLatest());
}

const parseData = data => {
    try{
        return JSON.parse(data);
    }catch(e){
        console.log(e);
        return null;
    }
}

const handleSocketMessages = ws => {
    ws.on("message", data => {
        const message = parseData(data);
        if(message === null){
            return;
        }
        console.log(message);
        switch(message.type){
            case GET_LATEST :
                sendMessage(ws, getLastBlock());
                break;
        }
    })
}

const sendMessage = (ws, message) => ws.send(JSON.stringify(message));


const handleSocketError = ws => {
    const closeSocketConnection = ws => {
        ws.close();
        sockets.splice(sockets.indexOf(ws), 1);
    };
    ws.on("close", ()=>closeSocketConnection(ws));
    ws.on("error", ()=>closeSocketConnection(ws));
}

const connectToPeers = newPeer => {
    const ws = new WebSockets(newPeer);
    ws.on("open", () => {
        initSocketConnection(ws);
    })
}

module.exports={
    startP2PServer,
    connectToPeers
}