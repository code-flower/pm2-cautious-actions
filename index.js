
/////////////////// IMPORTS ///////////////////

const pmx = require('pmx'),
      PM2 = require('./PM2'),
      Promise = require('bluebird');

///////////////// THE MODULE //////////////////

pmx.initModule({

  // Options related to the display style on Keymetrics
  widget : {

    // Logo displayed
    logo: 'https://app.keymetrics.io/img/logo/keymetrics-300.png',

    // Module colors
    // 0 = main element
    // 1 = secondary
    // 2 = main border
    // 3 = secondary border
    theme: ['#141A1F', '#222222', '#3ff', '#3ff'],

    // Section to show / hide
    el: {
      probes  : false,
      actions : false
    },

    // Main block to show / hide
    block : {
      actions: true,
      issues:  false,
      meta:    true,

      // Custom metrics to put in BIG
      main_probes : []
    }
  }

}, function(err, config) {

  if (err)
    console.log("error:", err);
  else
    console.log("module running:", config);

  ////////////////// CONFIG ////////////////////

  const APP_NAME     = config.appName;
  const MESSAGE_TYPE = config.messageType;

  ///////////////// FUNCTIONS //////////////////

  function cautiousExit(pmId) {
    return new Promise((resolve, reject) => {
      PM2.sendMessageToProcess(pmId, MESSAGE_TYPE)
        .then(msg => {
          if (!msg.data)
            reject(`Reload failed for process ${pmId}: response from process needs a data property.`);
          else if (!msg.data.success)
            reject(msg.data);
          else 
            resolve(pmId);
        })
        .catch(reject);
    });
  }

  function cautiousReload(pmId) {
    console.log('Reloading process id:', pmId);
    return cautiousExit(pmId).then(PM2.restart);
  }

  function cautiouslyReloadAll() {

    // handle configuration issues
    if (!APP_NAME)
      return Promise.reject('You must set the appName in the config before using this module.');

    if (!MESSAGE_TYPE)
      return Promise.reject('The messageType in the config may not be blank.');

    // run the cautious reload
    return PM2.connect(true)
      .then(PM2.list)
      .then(list => {
          
        // get a list of pmIds for the processes with the right name
        let pmIds = list.filter(el => el.name === APP_NAME)
                        .map(el => el.pm_id);

        // cautiously reload the processes in sequence
        return Promise
          .mapSeries(pmIds, pmId => cautiousReload(pmId))
          .then(() => PM2.disconnect())
          .then(() => Promise.resolve(pmIds));

      });
  }

  ////////////////// ACTIONS ////////////////////

  pmx.action('reload', reply => {
    cautiouslyReloadAll()
      .then(pmIds  => reply({ success: true,  data: { pmIds } }))
      .catch(error => reply({ success: false, error }));
  });

});

