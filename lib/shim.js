/**
 * shim.js: backported child_process.fork() function from nodejs 0.5.x
 * for nodejs 0.4.x / 0.6.x
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * Copyright Joyent, Inc. and other Node contributors.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

var child_process = require('child_process'),
    path = require('path'),
    spawn = child_process.spawn,
    Stream = require('net').Stream,
    bindings = require('./createpair.' + process.version);

var close = bindings.close,
    createpair = bindings.createpair;

/**
 * Setup one side of the bi-directional JSON communication channel
 * @private
 */
function setupChannel(target, fd) {
  var _channel = target._channel = new Stream(fd);
  _channel.writable = true;
  _channel.readable = true;

  _channel.resume();
  _channel.setEncoding('utf8');

  var buffer = '';
  _channel.on('data', function(d) {
    buffer += d;
    var i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      var json = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      var m = JSON.parse(json);
      target.emit('message', m);
    }
  });

  target.send = function(m) {
    _channel.write(JSON.stringify(m) + '\n');
  };

  target.on('end', function () {
    _channel.destroy();
  });
}


/**
 * Close file descriptor
 * @private
 */
function closeFd(fd) {
  if (fd >= 0) {
    close(fd);
    return -1;
  }
  return fd;
}

/**
 * Spawn a node child process with communication channel with the parent process
 */
exports.fork = function shimFork(modulePath, args, options) {
  if (!options) options = {};

  // Create communications socket pair
  var command = options.command,
      fds;
      
  try {
    fds = createpair();
  } catch (err) {
    var error = new Error('Error creating socket pair!');
    error.pairErr = err;
    throw(error);
  }
  
  // communicate message channel numbers to child via environment
  delete options.command;
  options.env = options.env || process.env;
  options.env.FORK_CHANNEL_FD = fds[0] + ':' + fds[1];
  options.env['PATH'] = options.env['PATH'] || process.env['PATH'];

  args = (args) ? args.slice() : [];
  args.unshift(modulePath);

  // execute node-fork before the requested modulePath and stay invisible?
  if (!options.visible) { 
    args.unshift(path.join(__dirname, 'fork.js'));
  }

  // Unless they used customFds/silent, just use the parent process stdout, stderr
  if (options.silent) options.customFds = [-1, -1, -1];
  if (!options.customFds) options.customFds = [0, 1, 2];

  // spawn the nodejs child process
  var child = spawn(command || process.execPath, args, options);


  // clean things we changed...
  delete options.env.FORK_CHANNEL_FD;
  options.command = command;

  // setup parent side of the comms channel
  setupChannel(child, fds[0]);

  return child;
};


/**
 * Execute the following code at module or child startup in order to be 
 * able to receive messages from the parent process. 
 * If we were spawned with env.FORK_CHANNEL_FD then get that var and start
 * parsing data from the given stream.
 */
exports.clientInitialize = function clientInitialize() {
  // clean fds argument
  var fds = process.env.FORK_CHANNEL_FD.split(':');
  fds[0] = parseInt(fds[0]);
  fds[1] = parseInt(fds[1]);
  
  // delete so no-one can use it later on
  delete process.env.FORK_CHANNEL_FD;
  
  // create comms channel with events/function on process
  if (fds[1] < 0) throw('No valid fd number available from parent process!');
  setupChannel(process, fds[1]);
}