
// this is a wrapper for the pm2 api
// http://pm2.keymetrics.io/docs/usage/pm2-api/

// it promisifies some useful api functions, handles 
// bus-related quirkiness, and adds some higher-order
// functions.

/////////////////////// IMPORTS //////////////////////////

const pm2 = require('pm2'),
      Promise = require('bluebird');

/////////////// PROMISIFIED PM2 FUNCTIONS ////////////////

function connect() {
  return new Promise((resolve, reject) => {
    pm2.connect(err => {
      if (err)
        reject(err);
      else
        resolve();
    });
  });
}

function launchBus() {
  return new Promise((resolve, reject) => {
    pm2.launchBus((err, bus) => {
      if (err)
        reject(err);
      else
        resolve(bus);
    });
  }); 
}

function sendDataToProcessId(pmId, type, data) {
  return new Promise((resolve, reject) => {
    pm2.sendDataToProcessId(pmId, {
      type,
      data,
      topic: type   // this field is required so we add even though duplicative
    }, (err, res) => {
      if (err)
        reject(err);
      else 
        resolve(res);
    });
  });
}

function list() {
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err)
        reject(err);
      else
        resolve(list);
    });
  });
}

function describe() {
  return new Promise((resolve, reject) => {
    pm2.describe((err, data) => {
      if (err)
        reject(err);
      else
        resolve(data);
    });
  });
}

function restart(pmId) {
  return new Promise((resolve, reject) => {
    pm2.restart(pmId, err => {
      if (err) 
        reject(err);
      else
        resolve(pmId);
    });
  });
}

// cant' be named "delete" because that's a reserved word
function deleteProc(pmId) {
  return new Promise((resolve, reject) => {
    pm2.delete(pmId, err => {
      if (err) 
        reject(err);
      else
        resolve(pmId);
    });
  });
}

///////////////// PM2 WRAPPER ////////////////

function PM2() {

  //// PRIVATE ////

  let bus;

  //// PUBLIC ////

  return {

    // set withBus to true if you want to send 
    // messages to a process after connecting
    connect: (withBus=false) => {
      if (withBus)
        return connect()
          .then(launchBus)
          .then(b => {
            bus = b;
            return Promise.resolve()
          });
      else 
        return connect();
    },

    sendMessageToProcess: (pmId, type, data={}) => {
      return new Promise((resolve, reject) => {
        if (!bus)
          reject(new Error('You must launch a bus before using this function.'));

        // when we get the same type back, resolve with the msg
        bus.on(type, msg => {
          if (msg.process.pm_id === pmId)
            resolve(msg);
        });

        // send the data
        sendDataToProcessId(pmId, type, data).catch(reject);
      });
    },

    list: list,

    describe: describe,

    restart: restart,

    delete: deleteProc,

    disconnect: () => {
      if (bus)
        bus.close();
      pm2.disconnect();
      return Promise.resolve();
    }

  };
}

//////////////////// EXPORTS //////////////////

module.exports = PM2();





