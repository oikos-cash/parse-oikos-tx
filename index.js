// https://tronscan.io/#/transaction/10747cb3c9ce3cdb403add7830afd22e7ad140a24eafccb7ec528d18838eafcc
//

const TronWeb = require("tronweb");
const ethers = require("ethers");

const { getAllEvents } = require("./utils");

const createTronWeb = () => {
  const HttpProvider = TronWeb.providers.HttpProvider;
  const fullNode = new HttpProvider("https://api.trongrid.io");
  const solidityNode = new HttpProvider("https://api.trongrid.io");
  const eventServer = new HttpProvider("https://api.trongrid.io");
  const privateKey =
    "3481E79956D4BD95F358AC96D151C976392FC4E3FC132F78A847906DE588C145";
  return new TronWeb(fullNode, solidityNode, eventServer, privateKey);
};

const getMethodSigHash = (methodSig) => {
  const sigHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(methodSig));
  return ethers.utils.hexDataSlice(sigHash, 0, 4);
};

const decodeMethodCall = (tx) => {
  const txData = `0x${tx.raw_data.contract[0].parameter.value.data}`;
  // console.log({ txData });

  const res = ethers.utils.defaultAbiCoder.decode(
    ["address", "uint256"],
    ethers.utils.hexDataSlice(txData, 4)
  );

  const expectedSigHash = getMethodSigHash("transfer(address,uint256)");
  const sigHash = ethers.utils.hexDataSlice(txData, 0, 4);

  if (expectedSigHash !== sigHash) {
    throw new Error("unknown method call");
  }

  // console.log({ expectedSigHash, sigHash, res });
  return res;
};

const allEvents = getAllEvents();
const decodeEvents = (txInfo) => {
  const events = txInfo.log.map((log, logIndex) => {
    const topics = log.topics.join(",");

    const abi = allEvents.find((source) =>
      topics.includes(source.signatureHash)
    );

    // web3 has a bug when decoding logs with indexed params... so we use ethers JS
    const iface = new ethers.utils.Interface([abi.abiSignature]);
    const eventDescription = iface.parseLog({
      data: `0x${log.data}`,
      topics: log.topics.map((t) => `0x${t}`),
      logIndex,
    });

    return eventDescription;
  });
  return events;
};

const start = async () => {
  const tronWeb = createTronWeb();
  const txId =
    "10747cb3c9ce3cdb403add7830afd22e7ad140a24eafccb7ec528d18838eafcc";
  const [tx, txInfo] = await Promise.all([
    tronWeb.trx.getTransaction(txId),
    tronWeb.trx.getTransactionInfo(txId),
  ]);
  // console.dir(tx, { depth: null });
  const [toAddress, value] = decodeMethodCall(tx);

  const events = decodeEvents(txInfo);
  console.log({
    toAddress: TronWeb.address.fromHex(`41${toAddress.substring(2)}`),
    value: value.toString(),
    blockNumber: txInfo.blockNumber,
    log: txInfo.log,
    events,
    // txInfo,
  });

  events.forEach((ev) => {
    console.log("---");
    console.log(`${ev.name} Event`);
    Object.keys(ev.args).forEach((argName) => {
      console.log(`${argName} = ${ev.args[argName]}`);
    });
  });
};

start().catch(console.error);
