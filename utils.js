const oikos = require("@oikos/oikos");
const TronWeb = require("tronweb");

const flatten = (acc, subarr) => acc.concat(subarr);

const getAllEvents = (network = "mainnet") => {
  const source = oikos.getSource({ network });
  return Object.keys(source)
    .map((key) => source[key].abi)
    .reduce(flatten, [])
    .filter((abi) => abi.type === "event")
    .map((abi) => {
      const signature = `${abi.name}(${abi.inputs
        .map((i) => i.type)
        .join(",")})`;
      const abiSignature = `event ${abi.name}(${abi.inputs
        .map((i) => `${i.type}${i.indexed ? " indexed " : " "}${i.name}`)
        .join(",")})`;
      const signatureHash = TronWeb.sha3(signature).substr("0x".length);
      return { ...abi, signature, signatureHash, abiSignature };
    });
};

module.exports = { getAllEvents };
