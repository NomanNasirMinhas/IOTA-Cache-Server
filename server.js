const express = require("express");
const cors = require("cors");
const fetch = require('node-fetch');
const app = express();
const {performance} = require('perf_hooks');

const seed = 'ZRDVTYZVHXRYALJYOYB9LLBSSSQZPJXZCYEPFLSNHDFRD9ZABGNEK9FOFLNJ9UYTJFHSTLZJQOWLPCFKE';
const address = 'RKIGD9HEUZHNKBWKQLFSJPWPMRSJGREBVNTRJDCFAZWMZTYRIIBZSXGBX9RGCEGVAXMYQZBUVUUHGBCBC';

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

const server = app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

  app.get("/", (req, res) => {
    res.status(201).json("Welcome to IOTA Server");
  });

  app.get("/port", (req, res) => {
    res.status(201).json(server.address().port);
  });

  //GET ALL ADDRESSES CALL
  app.get("/getResponseTime/:type", async (req, res) => {
    const type = req.params.type;
    try {
      var respTime = localStorage.getItem(`responseTime${type}`);
      if(respTime != undefined)
        res.status(201).json(Number(respTime));
      else
        res.status(201).json(Number.POSITIVE_INFINITY);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });

  //Get Seed Information
  app.get("/getData/:dataType", async (req, res) => {
    const type = req.params.dataType;

    try {

      if(localStorage.getItem(type) != undefined){
        var t0 = performance.now();
        console.log("Current Hash = ", localStorage.getItem(type))
        var result = await getPublicTransactionInfo(localStorage.getItem(type));
        localStorage.setItem(`responseTime${type}`, Number(performance.now() - t0).toString());
        res.status(201).json({result: result, responseTime: localStorage.getItem(`responseTime${type}`)});
      }
      else{
          var result = await fetch(`https://jsonplaceholder.typicode.com/posts/${Number(type)}`);
          result = await result.json();
          var t0 = performance.now();
          var addToIota = await sendPublicTransaction(seed, address, result, type)
          console.log("Current Hash = ", localStorage.getItem(type))
          localStorage.setItem(`responseTime${type}`, Number(performance.now() - t0).toString());
          res.status(201).json({result: result, responseTime: localStorage.getItem(`responseTime${type}`)});
      }
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });


  async function sendPublicTransaction(seed, address, data, type) {
    const Iota = require("@iota/core");
    const Converter = require("@iota/converter");
  
    const node = "https://nodes.thetangle.org:443";
    const iota = Iota.composeAPI({
      provider: node,
    });
  
    const depth = 3;
    const minimumWeightMagnitude = 14;
    const messageInTrytes = Converter.asciiToTrytes(JSON.stringify(data));
    const transfers = [
      {
        value: 0,
        address: address,
        message: messageInTrytes,
      },
    ];
    try{
    await iota
      .prepareTransfers(seed, transfers)
      .then((trytes) => {
        return iota.sendTrytes(trytes, depth, minimumWeightMagnitude);
      })
      .then((bundle) => {
        localStorage.setItem(type, bundle[0].hash);
      })
      .catch((err) => {
        console.error(err);
      });
    return true;
  }
  catch(e)
  {
    return [false, e]
  }
  }

  async function getPublicTransactionInfo(hash) {
    try {
      const Iota = require("@iota/core");
      const Extract = require("@iota/extract-json");
      const iota = Iota.composeAPI({
        provider: "https://nodes.thetangle.org:443",
      });
  
      const tailTransactionHash = hash;
      const Converter = require("@iota/converter");
  
      var txData = await iota.getBundle(tailTransactionHash);
  
      var txMsg = await JSON.parse(Extract.extractJson(txData));
      // var txMsg = Converter.trytesToAscii(
      //   txData[0].signatureMessageFragment.substring(0, 2186)
      // );

      return txMsg;
    } catch (err) {
      console.log(err)
      return false;
    }
  }