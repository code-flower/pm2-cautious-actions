## pm2-cautious-actions
pm2's graceful stop/reload without a kill timeout

### Overview
pm2 implements a [graceful stop/reload](http://pm2.keymetrics.io/docs/usage/signals-clean-restart/) using the SIGINT signal. The process is sent the signal and then given a certain amount of time to shut itself down. If the process fails to shut itself down within that time period (the "kill-timeout" period") it is forcibly shut down via a SIGTERM signal.

This method may work for most use cases, but for apps with long-running connections, it may be difficult to set an appropriate kill-timeout period. In addition, the use of SIGINT to initiate the graceful shutdown may interfere unnecessarily with child processes. This module offers an alternative.

Rather than using SIGINT, this module sends a message to the process over IPC telling the process to prepare for shutdown. When the process responds with a "success" message, the module either stops or reloads the process (depending on which action is triggered).

In the case where the process is being run in cluster mode and a reload is requested, the module cycles through the instances in sequence, cautiously reloading each one after the previous instance has been reloaded. This ensures that there are always processes online to accept new connections that come in during the reload process. In constrast, if a stop is requested, the instances are gracefully stopped in parallel -- the assumption being that no more connections will be coming in. 

### Installation
1. install the module
```
pm2 install code-flower/pm2-cautious-actions
```

2. Optionally, set the type of message you want to send to the process(es). If not set, the message type defaults to "prepForShutdown".
```
pm2 set pm2-cautious-actions:messageType [string]
```

### Usage
Like pm2's graceful stop/reload, in order to use the module you need to add a listener to your process that detects the message from the module. Then your code should perform whatever shutdown preparation is needed, and respond to this module by sending a "success" message. Here's an example:
```
process.on('message', message => {
  if (message.type === 'prepForShutdown')
    httpServer.close(() => {                // or whatever shutdown you need to do
      process.send({
        type: 'prepForShutdown',
        data: { success: true }
      });
    });
});
```
With the handler in place, you can trigger a stop or reload with:
```
pm2 trigger pm2-cautious-actions stop [name of app]
pm2 trigger pm2-cautious-actions reload [name of app]
```


