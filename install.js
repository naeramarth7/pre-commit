'use strict';

//
// Compatibility with older node.js as path.exists got moved to `fs`.
//
var fs = require('fs')
  , path = require('path')
  , os = require('os')
  , hook = path.join(__dirname, 'hook')
  , root = path.resolve(__dirname, '..', '..')
  , exists = fs.existsSync || path.existsSync;

//
// Gather the location of the possible hidden .git directory, the hooks
// directory which contains all git hooks and the absolute location of the
// `pre-push` file. The path needs to be absolute in order for the symlinking
// to work correctly.
//
var git = path.resolve(root, '.git')
  , hooks = path.resolve(git, 'hooks')
  , prepush = path.resolve(hooks, 'pre-push');

//
// Bail out if we don't have an `.git` directory as the hooks will not get
// triggered. If we do have directory create a hooks folder if it doesn't exist.
//
if (!exists(git) || !fs.lstatSync(git).isDirectory()) return;
if (!exists(hooks)) fs.mkdirSync(hooks);

//
// If there's an existing `pre-push` hook we want to back it up instead of
// overriding it and losing it completely as it might contain something
// important.
//
if (exists(prepush) && !fs.lstatSync(prepush).isSymbolicLink()) {
  console.log('pre-push:');
  console.log('pre-push: Detected an existing git pre-push hook');
  fs.writeFileSync(prepush +'.old', fs.readFileSync(prepush));
  console.log('pre-push: Old pre-push hook backuped to pre-push.old');
  console.log('pre-push:');
}

//
// We cannot create a symlink over an existing file so make sure it's gone and
// finish the installation process.
//
try { fs.unlinkSync(prepush); }
catch (e) {}

// Create generic prepush hook that launches this modules hook (as well
// as stashing - unstashing the unstaged changes)
// TODO: we could keep launching the old pre-push scripts
var hookRelativeUnixPath = hook.replace(root, '.');

if(os.platform() === 'win32') {
  hookRelativeUnixPath = hookRelativeUnixPath.replace(/[\\\/]+/g, '/');
}

var prepushContent = '#!/bin/bash' + os.EOL
  +  hookRelativeUnixPath + os.EOL
  + 'RESULT=$?' + os.EOL
  + '[ $RESULT -ne 0 ] && exit 1' + os.EOL
  + 'exit 0' + os.EOL;

//
// It could be that we do not have rights to this folder which could cause the
// installation of this module to completely fail. We should just output the
// error instead destroying the whole npm install process.
//
try { fs.writeFileSync(prepush, prepushContent); }
catch (e) {
  console.error('pre-push:');
  console.error('pre-push: Failed to create the hook file in your .git/hooks folder because:');
  console.error('pre-push: '+ e.message);
  console.error('pre-push: The hook was not installed.');
  console.error('pre-push:');
}

try { fs.chmodSync(prepush, '777'); }
catch (e) {
  console.error('pre-push:');
  console.error('pre-push: chmod 0777 the pre-push file in your .git/hooks folder because:');
  console.error('pre-push: '+ e.message);
  console.error('pre-push:');
}
